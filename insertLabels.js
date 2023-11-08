const { existsSync, readFileSync, writeFileSync } = require('fs');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');
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
// ([name, category, ...labels]) => ({ name, catergory, ...
const rows = csvRows
  .map((row) => row.split(';'))
  .map(([name, ...labels]) => ({
    name,
    ...languages.reduce(
      (acc, curr, index) => ({ ...acc, [curr]: labels[index] }),
      {},
    ),
  }));

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

languages.forEach((language) => {
  const { filePath, getLabels, createLabel, getXmlObject, keyProperty } =
    getConfig(language);

  const newLabels = rows.map(createLabel);
  const existingLabels = existsSync(filePath)
    ? getLabels(xmlParser.parse(readFileSync(filePath))).map((label) => ({
        ...label,
      }))
    : [];

  const mergedLabels = newLabels
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

  const xml = xmlBuilder.build(getXmlObject(mergedLabels));
  writeFileSync(filePath, xml);
});

function getConfig(language) {
  const { customLabel, translation } = config;
  return language === CUSTOM_LABEL_LOCALE
    ? customLabel(language)
    : translation(language);
}
