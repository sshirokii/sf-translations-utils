const { existsSync, readFileSync, writeFileSync } = require('fs');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');
const Papa = require('papaparse');
const isAlwaysArrayTags = ['customLabels', 'labels'];
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  isArray: (tagName) => isAlwaysArrayTags.includes(tagName),
});
const xmlBuilder = new XMLBuilder({
  format: true,
  indentBy: '    ',
  ignoreAttributes: false,
});
const PATH_CUSTOM_LABELS =
  'force-app/main/default/labels/CustomLabels.labels-meta.xml';
const XML_TRANSLATION_FILE_SUFFIX = '.translation-meta.xml';

const config = {
  customLabel: (language) => ({
    getLabels: ({ customLabels: { labels } }) => labels,
    createLabel: ({ name: fullName, [language]: value }) => ({
      fullName,
      language,
      protected: false,
      shortDescription: fullName,
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
  }),
  translation: (language) => ({
    getLabels: ({ Translations: { customLabels } }) => customLabels,
    createLabel: ({ name, [language]: label }) => ({
      label,
      name,
    }),
    filePath: language + XML_TRANSLATION_FILE_SUFFIX,
    keyProperty: 'name',
    getXmlObject: (customLabels) => ({
      Translations: {
        customLabels,
      },
    }),
  }),
};

// Attributes to set
const NEW_TRANSLATIONS_FILE_PATH = 'input.csv';
const CATEGORY = 'Service'; // default category value
const CUSTOM_LABEL_LOCALE = 'en_GB';

// Start processing...
// Custom category to set ? add column to destructuring before languages
const [[, ...languages]] = Papa.parse(NEW_TRANSLATIONS_FILE_PATH, {
  preview: 1,
});
const rows = Papa.parse(NEW_TRANSLATIONS_FILE_PATH, { header: true });

languages.forEach((language) => {
  const { filePath, getLabels, createLabel, getXmlObject, keyProperty } =
    getConfig(language);

  const newLabels = rows.map(createLabel);
  const existingLabels = existsSync(filePath)
    ? getExistingLabels(filePath, getLabels)
    : [];
  const mergedLabels = getMergedLabels(newLabels, keyProperty, existingLabels);

  const xml = xmlBuilder.build(getXmlObject(mergedLabels));
  writeFileSync(filePath, xml);
});

function getConfig(language) {
  const { customLabel, translation } = config;
  return language === CUSTOM_LABEL_LOCALE
    ? customLabel(language)
    : translation(language);
}

function getExistingLabels(filePath, getLabels) {
  const parsedXml = xmlParser.parse(readFileSync(filePath));
  return getLabels(parsedXml);
}

function getMergedLabels(newLabels, keyProperty, existingLabels) {
  return newLabels
    .reduce(
      (acc, customLabel) => [
        ...acc.filter(
          (existingLabel) =>
            existingLabel[keyProperty] !== customLabel[keyProperty],
        ),
        { ...customLabel },
      ],
      existingLabels,
    )
    .sort((a, b) => a[keyProperty].localeCompare(b[keyProperty]));
}
