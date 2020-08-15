/**
 * Copyright (c) 2020 Philippe Lieser
 *
 * This software is licensed under the terms of the MIT License.
 *
 * The above copyright and license notice shall be
 * included in all copies or substantial portions of the Software.
 */

// @ts-check
/* eslint-env browser, webextensions */

import { readTextFile } from "../test/helpers/testUtils.mjs.js";

class TableCellEditable extends HTMLTableCellElement {
	constructor() {
		super();

		this._span = document.createElement("span");

		this._input = document.createElement("input");
		this._input.hidden = true;
		this._input.type = "text";
		this._input.size = 1;
		this._input.style.padding = "0px";
		this._input.style.margin = "0px";
		this._input.style.width = "100%";
		this._input.style.borderStyle = "hidden";


		this.appendChild(this._span);
		this.appendChild(this._input);
	}

	static create() {
		/** @type {TableCellEditable} */
		// @ts-expect-error
		const cell = document.createElement("td", { is: "table-cell-editable" });
		return cell;
	}

	/**
	 *
	 * @param {Event} event
	 * @returns {TableCellEditable}
	 */
	static getFromEvent(event) {
		if (!(event.target instanceof HTMLElement)) {
			const msg = "Could not get TableCellEditable from event: event does not have a HTMLElement target";
			console.warn(msg, event);
			throw new Error(msg);
		}
		const cell = event.target.closest("td");
		if (!(cell instanceof TableCellEditable)) {
			const msg = "Could not get TableCellEditable from event: closest td is not an TableCellEditable";
			console.warn(msg, event);
			throw new Error(msg);
		}
		return cell;
	}

	/**
	 * @param {string} value
	 */
	set value(value) {
		this._span.innerText = value;
	}

	startEdit() {
		this._input.value = this._span.innerText;
		this._span.hidden = true;
		this._input.hidden = false;
		this._input.focus();
	}

	completeEdit() {
		this._span.innerText = this._input.value;
		this._span.hidden = false;
		this._input.hidden = true;
	}

	cancelEdit() {
		this._input.value = this._span.innerText;
		this._span.hidden = false;
		this._input.hidden = true;
	}
}
customElements.define("table-cell-editable", TableCellEditable, { extends: "td" });

export default class DataTable {
	/**
	 * @param {HTMLTableElement} tableElement
	 * @param {Object.<string, string>[]} data
	 */
	constructor(tableElement, data) {
		this.tbody = tableElement.getElementsByTagName("tbody")[0];
		this.isEditing = false;

		this.columns = Array.from(tableElement.getElementsByTagName("th")).
			map(th => th.dataset.name);

		this.showData(data);
	}

	/**
	 *
	 * @param {Object.<string, string>[]} data
	 * @returns {void}
	 */
	showData(data) {
		const tbody = document.createElement("tbody");
		tbody.ondblclick = (event) => this._startEdit(event);
		tbody.addEventListener('focusout', (event) => this._stopEditFocusout(event));
		tbody.onkeydown = (event) => this._stopEditKeydown(event);

		for (const item of data) {
			const tr = document.createElement("tr");
			for (const column of this.columns) {
				const td = TableCellEditable.create();
				tr.appendChild(td);
				if (column === undefined) {
					// ignore columns that do not have data-name
					continue;
				}
				if (!Object.hasOwnProperty.call(item, column)) {
					// don't add anything of the item does not have any value for the column
					continue;
				}
				td.value = item[column];
			}
			tbody.appendChild(tr);
		}

		this.tbody.replaceWith(tbody);
	}

	/**
	 * @param {Event} event
	 * @returns {void}
	 */
	_startEdit(event) {
		if (this.isEditing) {
			return;
		}
		this.isEditing = true;
		const cell = TableCellEditable.getFromEvent(event);
		cell.startEdit();
	}

	/**
	 * @param {FocusEvent} event
	 * @returns {void}
	 */
	_stopEditFocusout(event) {
		if (!this.isEditing) {
			return;
		}
		this.isEditing = false;
		const cell = TableCellEditable.getFromEvent(event);
		cell.completeEdit();
	}

	/**
	 * @param {KeyboardEvent} event
	 * @returns {void}
	 */
	_stopEditKeydown(event) {
		if (!this.isEditing) {
			return;
		}
		const cell = TableCellEditable.getFromEvent(event);
		switch (event.key) {
			case "Escape":
				this.isEditing = false;
				cell.cancelEdit();
				break;
			case "Enter":
				this.isEditing = false;
				cell.completeEdit();
				break;
			default:
		}
	}
}

(async () => {
	const signersDefault = await readTextFile("data/signersDefault.json");
	/** @type {any[]} */
	let data = JSON.parse(signersDefault).rules;
	globalThis.data = data;

	/** @type {HTMLTableElement} */
	// @ts-expect-error
	const tableElement = document.getElementById("test");
	const table = new DataTable(tableElement, data);
})();
