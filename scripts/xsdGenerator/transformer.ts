import { assert } from '../../src/assert';
import { TsType, XsdType } from './model';

function convertXsdDataType(dType: XsdType) {
  switch (dType){
    case 'xs:byte':
    case 'xs:decimal':
    case 'xs:int':
    case 'xs:integer':
    case 'xs:long':
    case 'xs:negativeInteger':
    case 'xs:nonNegativeInteger':
    case 'xs:nonPositiveInteger':
    case 'xs:positiveInteger':
    case 'xs:short':
    case 'xs:unsignedLong':
    case 'xs:unsignedInt':
    case 'xs:unsignedShort':
    case 'xs:unsignedByte':
    case 'xs:double':
    case 'xs:float':
      return 'number' as TsType;
    case 'xs:ENTITIES':
    case 'xs:ENTITY':
    case 'xs:ID':
    case 'xs:IDREF':
    case 'xs:IDREFS':
    case 'xs:Name':
    case 'xs:NCName':
    case 'xs:NMTOKEN':
    case 'xs:NMTOKENS':
    case 'xs:normalizedString':
    case 'xs:QName':
    case 'xs:string':
    case 'xs:token':
      return 'string' as TsType;
    case 'xs:boolean':
      return 'boolean' as TsType;
    default:
      assert(!dType.startsWith('xs:'));
      return dType as unknown as TsType;
  }
}
