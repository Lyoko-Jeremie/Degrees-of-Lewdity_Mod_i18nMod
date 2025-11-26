Object.defineProperty(Array.prototype, "formatList", {
	configurable: true,
	writable: true,
	value(options) {
		let { conjunction, useOxfordComma, separator } = Object.assign(
			{
				conjunction: "和",
				useOxfordComma: false,
				separator: "、",
			},
			options
		);
		if (this == null) {
			throw new TypeError("Array.prototype.formatList called on null or undefined.");
		}
		if (this.length === 0) {
			return "";
		}
		if (this.length <= 2) return this.join(conjunction);
		const oxConj = conjunction;
		return this.slice(0, -1).join(separator) + oxConj + this.last();
	},
});
