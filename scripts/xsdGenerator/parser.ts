/* eslint-disable @typescript-eslint/no-use-before-define */
// From JSDOM to our model
// The mainly reason to use JSDOM is that it's a tree the the children know the parent.
// This would be powerful when do some change.

import { JSDOM } from 'jsdom';

import { assert } from '../../src/assert';

import {
  Annotation,
  Schema,
  All,
  Any,
  Appinfo,
  Attribute,
  AttributeGroup,
  Choice,
  ComplexContent,
  ComplexType,
  Documentation,
  Enumeration,
  Group,
  Restriction,
  Sequence,
  SimpleContent,
  SimpleType,
  Extension,
  Element as XsdElement,
} from './model';

const knownModelClassOfXsd = [
  Annotation,
  Schema,
  All,
  Any,
  Appinfo,
  Attribute,
  AttributeGroup,
  Choice,
  ComplexContent,
  ComplexType,
  Documentation,
  Enumeration,
  Group,
  Restriction,
  Sequence,
  SimpleContent,
  SimpleType,
  Extension,
  XsdElement,
];

function findXsdModelClassByElementName(elementName: string) {
  const xsdModelClass = knownModelClassOfXsd.find(modelClass => modelClass.tagName === elementName);
  assert(xsdModelClass);
  return xsdModelClass;
}

const ATTRIBUTE_PREFIX = '$';

function parseWorker(node: Element | undefined) {
  if (!node) {
    return undefined;
  }
  const xsdMoel = knownModelClassOfXsd.find(model => {
    return model.tagName == node.tagName;
  });
  assert(xsdMoel, `"${node.nodeName}" can not be handled for now.`);
  // use the clue to get value from node
  // @ts-ignore
  const xsdMoelClue: any = new xsdMoel({});
  const propertyNames = Object.keys(xsdMoelClue);
  // starts with '_' means it's private, not get it from node.
  const publicPropertyNames = propertyNames.filter(name =>
    !name.startsWith('_'));

  const attributePropertyNames = publicPropertyNames.filter(name =>
    name.startsWith(ATTRIBUTE_PREFIX));
  const elementPropertyNames = publicPropertyNames.filter(name =>
    !name.startsWith(ATTRIBUTE_PREFIX));
  const childrenElements = Array.from(node.children);

  logUnhanldedAttribute();

  logUnhandledElementChild();

  const attributeEntries = attributePropertyNames.map(attributePropertyName => {
    assert(attributePropertyName[0] === ATTRIBUTE_PREFIX);
    const attributeName = attributePropertyName.substring(1);
    const attributeValue = node.getAttribute(attributeName);
    return [attributePropertyName, attributeValue];
  });

  const elementEntries = elementPropertyNames.map(elementPropertyName => {
    const elements = childrenElements.filter(e =>
      isElementNameMatch(elementPropertyName, e.tagName));
    let elementPropertyValue: any;
    if (!Array.isArray(xsdMoelClue[elementPropertyName])) {
      // at most one
      assert(elements.length <= 1);
      const xsdModel = parseWorker(elements[0]);
      elementPropertyValue = xsdModel;
    } else {
      elementPropertyValue = [];
      elements.forEach(e => {
        const xsdModel = parseWorker(e);
        elementPropertyValue.push(xsdModel);
      });
    }

    return [elementPropertyName, elementPropertyValue];
  });

  const options = {
    ...Object.fromEntries(attributeEntries),
    ...Object.fromEntries(elementEntries),
  };

  const xsdModelClass = findXsdModelClassByElementName(node.tagName);
  const xsdModel = new xsdModelClass(options);
  return xsdModel;

  function logUnhanldedAttribute() {
    const attributeNames = node!.getAttributeNames();
    attributeNames.forEach(attributeName => {
      const isHandled = attributePropertyNames.some(attributePropertyName =>
        isAttributeNameMatch(attributePropertyName, attributeName));
      if (!isHandled) {
        if (node!.tagName === Schema.tagName) {
          return;
        }
        console.warn(`Attribute "${attributeName}" is not handled in element ${node!.tagName}`);
      }
    });
  }

  function logUnhandledElementChild() {
    const elementNames = childrenElements.map(e => e.tagName);
    elementNames.forEach(elementName => {
      const isHandled = elementPropertyNames.some(elementPropertyName =>
        isElementNameMatch(elementPropertyName, elementName));
      if (!isHandled)
        console.warn(`Element child "${elementName}" is not handled in element ${node!.tagName}`);
    });
  }
}

function isElementNameMatch(elementPropertyName: string, elementName: string) {
  return `xs:${elementPropertyName}` === elementName;
}

function isAttributeNameMatch(attributePropertyName: string, attributeName: string) {
  return `${ATTRIBUTE_PREFIX}${attributeName}` === attributePropertyName;
}

export function parseXsd(xsdString: string) {
  const dom = new JSDOM(xsdString, { contentType: 'application/xml' });
  const root = dom.window.document.getRootNode();
  const children = root.childNodes;
  assert(children.length === 1);
  const child: Element = children[0] as Element;
  assert(child.nodeType === 1); // node is Element
  assert(child.nodeName === Schema.tagName);
  const modelRoot = parseWorker(child);
  return modelRoot;
}
