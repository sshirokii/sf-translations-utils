const { existsSync, readFileSync, writeFileSync } = require('fs');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');
const isAlwaysArrayTags = ['customLabels'];
const parser = new XMLParser({
    ignoreAttributes: false,
    isArray: (tagName) => isAlwaysArrayTags.includes(tagName),
});
const builder = new XMLBuilder({
    format: true,
    indentBy: '    ',
    ignoreAttributes: false
});
const newTranslationsFilePath = 'input.csv';
const xmlFileNameSuffix = '.translation-meta.xml';

// start processing...
const data = readFileSync(newTranslationsFilePath, 'utf8');
const [header, ...csvRows] = data.split('\n');
const [, ...languages] = header.split(';');

const rows = csvRows
    .map((row) => row.split(';'))
    .map(([name, ...labels]) => ({ name, labels }));

// open custom labels file
// add new custom labels

languages.forEach((language, languageIndex) => {
    const labelsToInsert = rows
    .map(({ name, labels }) => ({
        name,
        label: labels[languageIndex]
    }))
    .filter(({ label }) => label);

    let xmlObject;
    const fileName = language + xmlFileNameSuffix;
    if (!existsSync(fileName)) {
        xmlObject = {
            Translations: {
                customLabels: labelsToInsert
            }
        };
    } else {
        const xmlData = readFileSync(fileName);
        xmlObject = parser.parse(xmlData);
        const { Translations: { customLabels }} = xmlObject;

        labelsToInsert.forEach((customLabel) => {
            const { name, label } = customLabel;
            const existingLabel = customLabels.find(
                (customLabel) => customLabel.name === name
            );
            if (existingLabel) {
                existingLabel.label = label;
            } else {
                customLabels.push(customLabel)
            }
        });
    }
    const xml = builder.build(xmlObject);
    writeFileSync(fileName, xml);
});
