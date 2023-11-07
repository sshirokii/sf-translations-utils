const { existsSync, readFileSync, writeFileSync } = require('fs');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');
const isAlwaysArrayTags = ['customLabels', 'labels'];
const parser = new XMLParser({
    ignoreAttributes: false,
    isArray: (tagName) => isAlwaysArrayTags.includes(tagName),
});
const builder = new XMLBuilder({
    format: true,
    indentBy: '    ',
    ignoreAttributes: false,
});
const PATH_CUSTOM_LABELS = 'force-app/main/default/labels/CustomLabels.labels-meta.xml';
const XML_TRANSLATION_FILE_SUFFIX = '.translation-meta.xml';

// ATTRIBUTES TO SET
const NEW_TRANSLATIONS_FILE_PATH = 'input.csv';
// default category value
const CATEGORY = 'Service';
const CUSTOM_LABEL_LOCALE = 'en_GB';

// start processing...
const data = readFileSync(NEW_TRANSLATIONS_FILE_PATH, 'utf8');
const [header, ...csvRows] = data.split('\n');
const [, , ...languages] = header.split(';');

// custom category to set ? add column to destructuring
// ([name, category, ...labels])
const rows = csvRows.map((row) => row.split(';')).
    map(([name, ...labels]) => ({
        name,
        ...languages.reduce(
            (acc, curr, index) => ({ ...acc, [curr]: labels[index] }), {}),
    }));

const setConfig = (language) => ({
    customLabel: {
        getLabels: ({ customLabels: { labels } }) => labels,
        createLabel: ({ name, [language]: value }) => ({
            fullName: name,
            language,
            protected: false,
            shortDescription: name,
            category: CATEGORY,
            value,
        }),
        filePath: PATH_CUSTOM_LABELS,
        keyProperty: 'fullName',
        getXmlObject: (labels) => ({
            customLabels: {
                labels,
            },
        }),
    },
    translation: {
        getLabels: ({ Translations: { customLabels } }) => customLabels,
        createLabel: ({ name, [language]: value }) => ({
            label: value,
            name,
        }),
        filePath: language + XML_TRANSLATION_FILE_SUFFIX,
        keyProperty: 'name',
        getXmlObject: (customLabels) => ({
            Translations: {
                customLabels,
            },
        }),
    },
});

const getConfig = (language) => {
    const { customLabel, translation} = setConfig(language);
    return language === CUSTOM_LABEL_LOCALE
        ? customLabel
        : translation;
};

languages.forEach((language) => {
    const {
        createLabel,
        getLabels,
        filePath,
        getXmlObject,
        keyProperty,
    } = getConfig(language);

    const labels = rows.map(createLabel);
    const existingLabels = existsSync(filePath) ? getLabels(parser.parse(
        readFileSync(filePath))).map(label => ({ ...label })) : [];

    const result = labels.reduce((acc, customLabel) => [
        ...acc.filter(
            (existingLabel) => existingLabel[keyProperty] !==
                customLabel[keyProperty],
        ), { ...customLabel }], existingLabels).
        sort((a, b) => a[keyProperty].localeCompare(b[keyProperty]));

    const xml = builder.build(getXmlObject(result));
    writeFileSync(filePath, xml);
});