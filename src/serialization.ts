/* eslint-disable @typescript-eslint/no-use-before-define */
import { escape, stripAnsiEscapes } from './copyFromPlaywrightRepo';

const ATTRIBUTE_PREFIX = '$';
// elemnt could be string, in which case it will be transformed to
// an element with only text content.
// Vut if it has any attribute, then
// text content should be '__text'

const TEXT_PROPERTY = '__text';

function isAttribute(p: string) {
  return p.startsWith(ATTRIBUTE_PREFIX);
}

function isText(p: string) {
  return p === TEXT_PROPERTY;
}

function isElement(p: string) {
  return !isAttribute(p) && !isText(p);
}

function isEmpty(value: any) {
  return value === undefined
    || value === null
    || value === ''
    || (Array.isArray(value) && value.length === 0);
}

function serializeString2Xml(lines: string[], modelName: string, model: string, stripANSIControlSequences: boolean) {
  const startTag = `<${modelName}>`;
  lines.push(startTag);

  const rawText = model;

  if (rawText) { lines.push(escape(rawText, stripANSIControlSequences, true)); }

  const endTag = `</${modelName}>`;
  lines.push(endTag);
}

function serialize2XmlElementWithChildren(lines: string[], tagName: string, attributes: string[], elementKeyValuePairs: any[][], rawContent: string, stripANSIControlSequences: boolean) {
  const startTag = `<${tagName}${attributes.length ? ' ' : ''}${attributes.join(' ')}>`;
  lines.push(startTag);

  elementKeyValuePairs.forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((v) => serialize2Xml(lines, key, v, stripANSIControlSequences));
    } else {
      serialize2Xml(lines, key, value, stripANSIControlSequences);
    }
  });

  if (rawContent) { lines.push(escape(rawContent, stripANSIControlSequences, true)); }

  const endTag = `</${tagName}>`;
  lines.push(endTag);
}

function serialize2XmlElementWithoutChildren(lines: string[], tagName: string, attributes: string[]) {
  const selfCloseTag = `<${tagName}${attributes.length ? ' ' : ''}${attributes.join(' ')}/>`;
  lines.push(selfCloseTag);
}

export function serialize2Xml(lines: string[], modelName: string, model: any, stripANSIControlSequences: boolean) {
  if (isElement(modelName) && typeof model === 'string') {
    serializeString2Xml(lines, modelName, model, stripANSIControlSequences);
    return;
  }
  const properties = Object.keys(model);
  const attributeProperties = properties.filter(isAttribute);
  const elementProperties = properties.filter(isElement);

  const attributeKeyValuePairs = attributeProperties.map((p) => {
    const key = p.slice(1); // remove '$' prefix
    const value = model[p];
    return [key, value];
  }).filter(([, value]) => !isEmpty(value));

  const elementKeyValuePairs = elementProperties.map((p) => {
    const value = model[p];
    return [p, value];
  }).filter(([, value]) => !isEmpty(value));

  const attrs: string[] = attributeKeyValuePairs.map(([key, value]) => {
    const attrValue = escape(String(value), stripANSIControlSequences, false);
    return `${key}="${attrValue}"`;
  });

  if (elementKeyValuePairs.length > 0 || model[TEXT_PROPERTY]) {
    serialize2XmlElementWithChildren(lines, modelName, attrs, elementKeyValuePairs, model[TEXT_PROPERTY], stripANSIControlSequences);
  } else {
    serialize2XmlElementWithoutChildren(lines, modelName, attrs);
  }
}
