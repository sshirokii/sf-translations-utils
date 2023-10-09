const { existsSync, readFileSync, writeFileSync } = require('fs');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');
const parser = new XMLParser({
    ignoreAttributes: false
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

        labelsToInsert.forEach(({ name, label }) => {
            const labelToUpdate = xmlObject.Translations.customLabels.find(
                ({ name: [nameValue] }) => nameValue === name
            );
            if (labelToUpdate) {
                labelToUpdate.label = [label];
            } else {
                xmlObject.Translations.customLabels.push({
                    label: [label],
                    name: [name]
                });
            }
        });
    }
    const xml = builder.build(xmlObject);
    writeFileSync(fileName, xml);
});
