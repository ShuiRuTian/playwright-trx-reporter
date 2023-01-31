import assert from 'assert';
import { X2jOptions, XMLParser } from 'fast-xml-parser';
import { readFile } from 'fs/promises';
import path from 'path';

const FRAGLE_ATTRIBUTES_KEY = "__FRAGLE";

/**
 * Some attribute is always changing.
 * 
 * Not compare such attributes.
 */
const fragileAttributeTree = {
    TestRun: {
        [FRAGLE_ATTRIBUTES_KEY]: ["id", "name"],
        TestDefinitions: {
            UnitTest: {
                [FRAGLE_ATTRIBUTES_KEY]: ["storage"],
                TestMethod: {
                    [FRAGLE_ATTRIBUTES_KEY]: ["codeBase"],
                }
            }
        },
        TestEntries: {
            TestEntry: {
                [FRAGLE_ATTRIBUTES_KEY]: ["executionId"],
            }
        },
        Times: {
            [FRAGLE_ATTRIBUTES_KEY]: ["creation", "finish"],
        },
        Results: {
            UnitTestResult: {
                [FRAGLE_ATTRIBUTES_KEY]: ["computerName", "executionId", "startTime", "endTime", "duration"],
            }
        }
    }
}

const ATTRIBUTE_PREFIX = '@';

function isAttributeEntry(entryName: string) {
    return entryName.startsWith(ATTRIBUTE_PREFIX);
}

const xmlParserOptions: Partial<X2jOptions> = {
    ignoreAttributes: false,
    attributeNamePrefix: ATTRIBUTE_PREFIX,
};

const xmlParser = new XMLParser(xmlParserOptions);

function compareXmlObject(a: any, b: any, fragileTree: any) {
    const aEntries = Object.entries(a);
    const bEntries = Object.entries(b);

    assert(aEntries.length === bEntries.length);

    const length = aEntries.length;
    for (let index = 0; index < length; index++) {
        const aEntry = aEntries[index];
        const bEntry = bEntries[index];

        assert(aEntry[0] === bEntry[0], 'key of xml object must be same');

        const entryName = aEntry[0];
        const attributeName = entryName.substring(ATTRIBUTE_PREFIX.length); // skip the prefix

        if (isAttributeEntry(entryName)) {
            const isAttributeFragile = fragileTree?.[FRAGLE_ATTRIBUTES_KEY]?.includes(attributeName);
            // Just skip if the attribute is fragile
            if (!isAttributeFragile) {
                assert(aEntry[1] === bEntry[1], 'non-fragile attribute value of xml object must be same');
            }
        }
        else {
            const nextFragileTree = fragileTree?.[entryName];
            equalMap(
                (x: any, y: any) => compareXmlObject(x, y, nextFragileTree),
                aEntry[1],
                bEntry[1],
            );
        }
    }
}

function equalMap(cb: Function, a: any, b: any): any {
    assert(Array.isArray(a) === Array.isArray(b));
    if (Array.isArray(a)) {
        assert(a.length === b.length);
        const length = a.length;
        for (let index = 0; index < length; index++) {
            const elementA = a[index];
            const elementB = b[index];
            return equalMap(cb, elementA, elementB);
        }
    }
    return cb(a, b);
}

describe('playwright trx reporter', () => {
    it('must match the base line', async () => {
        const [baselineText, currentText] = await Promise.all([
            readFile(path.resolve(__dirname, 'baseline.trx')),
            readFile(path.resolve(__dirname, '..', 'playwright-test-reports', 'trxForm.trx')),
        ]);
        const baselineObject = xmlParser.parse(baselineText);
        const currentObject = xmlParser.parse(currentText);
        compareXmlObject(baselineObject, currentObject, fragileAttributeTree);
    });
});
