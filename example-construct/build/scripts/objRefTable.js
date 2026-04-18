const C3 = self.C3;
self.C3_GetObjectRefTable = function () {
	return [
		C3.Plugins.Text
	];
};
self.C3_JsPropNameTable = [
	{TitleText: 0},
	{InfoText: 0},
	{FieldText: 0},
	{FooterText: 0}
];

self.InstanceType = {
	TitleText: class extends self.ITextInstance {},
	InfoText: class extends self.ITextInstance {},
	FieldText: class extends self.ITextInstance {},
	FooterText: class extends self.ITextInstance {}
}