// property starts with dollar('$') only means they are parsed from attribute
// it's only helpful for devlopping, and not have any other meanings.

// Constraint:
//   all attribute starts with '$'
//   all array must be initialized with [] by default

export type XsdType = string & { _xsdType: void };

export type TsType = string & { _tsType: void };

export class Element {
  static tagName = 'xs:element';

  private readonly _kind = 'Element';

  constructor(options: Element) {
    this.$id = options.$id;
    this.$name = options.$name;
    this.$ref = options.$ref;
    this.$type = options.$type;
    this.$substitutionGroup = options.$substitutionGroup;
    this.$default = options.$default;
    this.$fixed = options.$fixed;
    this.$form = options.$form;
    this.$maxOccurs = options.$maxOccurs ?? this.$maxOccurs;
    this.$minOccurs = options.$minOccurs ?? this.$minOccurs;
    this.$abstract = options.$abstract ?? this.$abstract;
    this.annotation = options.annotation ?? this.annotation;
    this.simpleType = options.simpleType;
    this.complexType = options.complexType;
  }

  $id?: string;

  $name?: string;

  $ref?: string;

  $type?: string;

  $substitutionGroup?: string;

  $default?: string;

  $fixed?: string;

  $form?: 'qualified' | 'unqualified';

  $maxOccurs?: number = 1;

  $minOccurs?: number = 1;

  $abstract = false;

  annotation: Annotation[] = [];

  simpleType?: SimpleType;

  complexType?: ComplexType;
}

export class Schema {
  static tagName = 'xs:schema';

  private readonly _kind = 'Schema';

  constructor(options: Schema) {
    this.annotation = options.annotation ?? [];
    this.attribute = options.attribute ?? [];
    this.attributeGroup = options.attributeGroup ?? [];
    this.complexType = options.complexType ?? [];
    this.element = options.element ?? [];
    this.group = options.group ?? [];
    this.simpleType = options.simpleType ?? [];
  }

  annotation: Annotation[];

  simpleType?: SimpleType[];

  complexType?: ComplexType[];

  group?: Group[];

  attributeGroup?: AttributeGroup[];

  element?: Element[];

  attribute?: Attribute[];
}

export class Attribute {
  static tagName = 'xs:attribute';

  private readonly _kind = 'Attribute';

  constructor(options: Attribute) {
    this.$name = options.$name;
    this.$type = options.$type;
    this.$default = options.$default;
    this.$form = options.$form;
    this.$fixed = options.$fixed;
    this.$use = options.$use ?? this.$use;
    this.annotation = options.annotation;
    this.simpleType = options.simpleType;
  }

  $name: string;

  $type: XsdType;

  $default?: string;

  $fixed?: string;

  $form?: 'qualified' | 'unqualified';

  $use: 'optional' | 'required' = 'optional';

  annotation?: Annotation;

  simpleType?: SimpleType;

}

export class SimpleType {
  static tagName = 'xs:simpleType';

  private readonly _kind = 'SimpleType';

  constructor(options: SimpleType) {
    this.$id = options.$id;
    this.$name = options.$name;
    this.annotation = options.annotation;
    this.restriction = options.restriction;
  }

  $id?: number;

  $name?: string;

  annotation?: Annotation;

  restriction: Restriction;
}

export class SimpleContent {
  static tagName = 'xs:simpleContent';

  private readonly _kind = 'SimpleContent';

  constructor(options: SimpleContent) {
    this.annotation = options.annotation;
    this.retriction = options.retriction;
    this.extension = options.extension;
  }

  annotation?: Annotation;

  retriction?: Restriction;

  extension?: Extension;
}

export class Extension {
  static tagName = 'xs:extension';

  private readonly _kind = 'Extension';

  constructor(options: Extension) {
    this.$id = options.$id;
    this.$base = options.$base;
    this.annotation = options.annotation;
    this.group = options.group;
    this.all = options.all;
    this.choice = options.choice;
    this.sequence = options.sequence;
    this.attribute = options.attribute ?? this.attribute;
    this.attributeGroup = options.attributeGroup ?? this.attributeGroup;
  }

  $id?: string;

  $base: XsdType;

  annotation?: Annotation;

  group?: Group;

  all?: All;

  choice?: Choice;

  sequence?: Sequence;

  attribute: Attribute[] = [];

  attributeGroup: AttributeGroup[] = [];
}

export class Annotation {
  static tagName = 'xs:annotation';

  private readonly _kind = 'Annotation';

  constructor(options: Annotation) {
    this.$id = options.$id;
    this.appinfo = options.appinfo ?? [];
    this.documentation = options.documentation ?? [];
  }

  $id: string;

  appinfo?: Appinfo[];

  documentation?: Documentation[];
}

export class Appinfo {
  static tagName = 'xs:appinfo';

  private readonly _kind = 'Appinfo';

  constructor(options: Appinfo) {
    this._kind = 'Appinfo';
  }
}

export class Documentation {
  static tagName = 'xs:documentation';

  private readonly _kind = 'Documentation';

  constructor(options: Documentation) {
    this._kind = 'Documentation';
  }
}

export class Restriction {
  static tagName = 'xs:restriction';

  private readonly _kind = 'Restriction';

  constructor(options: Restriction) {
    this.$id = options.$id;
    this.$base = options.$base;
    this.enumeration = options.enumeration ?? [];
  }

  $id?: string;

  $base: XsdType;

  enumeration: Enumeration[];
}

export class Enumeration {
  static tagName = 'xs:enumeration';

  private readonly _kind = 'Enumeration';

  constructor(options: Enumeration) {
    this.$value = options.$value;
  }

  $value: string;
}

export class ComplexType {
  static tagName = 'xs:complexType';

  private readonly _kind = 'ComplexType';

  constructor(options: ComplexType) {
    this.$id = options.$id;
    this.$name = options.$name;
    this.$abstract = options.$abstract ?? this.$abstract;
    this.$mixed = options.$mixed ?? this.$mixed;
    this.$blcok = options.$blcok;
    this.$final = options.$final;
    this.annotation = options.annotation;
    this.simpleContent = options.simpleContent;
    this.complexContent = options.complexContent;
    this.group = options.group;
    this.all = options.all;
    this.choice = options.choice;
    this.sequence = options.sequence;
    this.attribute = options.attribute ?? [];
    this.attributeGroup = options.attributeGroup ?? [];
  }

  $id?: string;

  $name?: string;

  $abstract?: boolean = false;

  $mixed = false;

  $blcok?: void;

  $final?: void;

  annotation?: Annotation;

  simpleContent?: SimpleContent;

  complexContent?: ComplexContent;

  group?: Group;

  all?: All;

  choice?: Choice;

  sequence?: Sequence;

  attribute?: Attribute[];

  attributeGroup?: AttributeGroup[];

}

export class ComplexContent {
  static tagName = 'xs:complexContent';

  private readonly _kind = 'ComplexContent';

  constructor(options: ComplexContent) {
    this.$id = options.$id;
    this.$mixed = options.$mixed;
    this.annotation = options.annotation;
    this.restriction = options.restriction;
    this.extension = options.extension;
  }

  $id?: string;

  $mixed = false;

  annotation?: Annotation;

  restriction?: Restriction;

  extension?: Extension;

}

interface WithOccurrence {
  $maxOccurs: number;
  $minOccurs: number;
}

export class Group implements WithOccurrence {
  static tagName = 'xs:group';

  private readonly _kind = 'Group';

  constructor(options: Group) {
    this.$maxOccurs = options.$maxOccurs ?? this.$maxOccurs;
    this.$minOccurs = options.$minOccurs ?? this.$minOccurs;
    this.all = options.all;
    this.choice = options.choice;
    this.sequence = options.sequence;
  }

  $maxOccurs = 1;

  $minOccurs = 1;

  all?: All;

  choice?: Choice;

  sequence?: Sequence;
}

export class AttributeGroup implements WithOccurrence {
  static tagName = 'xs:attributeGroup';

  private readonly _kind = 'AttributeGroup';

  constructor(options: AttributeGroup) {
    this.$maxOccurs = options.$maxOccurs ?? this.$maxOccurs;
    this.$minOccurs = options.$minOccurs ?? this.$minOccurs;
  }

  $maxOccurs = 1;

  $minOccurs = 1;
}

export class All implements WithOccurrence {
  static tagName = 'xs:all';

  private readonly _kind = 'All';

  constructor(options: All) {
    this.$maxOccurs = options.$maxOccurs ?? this.$maxOccurs;
    this.$minOccurs = options.$minOccurs ?? this.$minOccurs;
    this.element = options.element ?? this.element;
  }

  $maxOccurs = 1;

  $minOccurs = 1;

  element: Element[] = [];
}

export class Choice implements WithOccurrence {
  static tagName = 'xs:choice';

  private readonly _kind = 'Choice';

  constructor(options: Choice) {
    this.$maxOccurs = options.$maxOccurs ?? this.$maxOccurs;
    this.$minOccurs = options.$minOccurs ?? this.$minOccurs;
    this.element = options.element ?? this.element;
    this.group = options.group ?? this.group;
    this.choice = options.choice ?? this.choice;
    this.sequence = options.sequence ?? this.sequence;
    this.any = options.any ?? this.any;
  }

  $maxOccurs = 1;

  $minOccurs = 1;

  annotation: Annotation[] = [];

  element: Element[] = [];

  group: Group[] = [];

  choice: Choice[] = [];

  sequence: Sequence[] = [];

  any: Any[] = [];


}

export class Sequence implements WithOccurrence {
  static tagName = 'xs:sequence';

  private readonly _kind = 'Sequence';

  constructor(options: Sequence) {
    this.$maxOccurs = options.$maxOccurs ?? this.$maxOccurs;
    this.$minOccurs = options.$minOccurs ?? this.$minOccurs;
    this.element = options.element ?? this.element;
    this.group = options.group ?? this.group;
    this.choice = options.choice ?? this.choice;
    this.sequence = options.sequence ?? this.sequence;
    this.any = options.any ?? this.any;
  }

  $maxOccurs = 1;

  $minOccurs = 1;

  annotation: Annotation[] = [];

  element: Element[] = [];

  group: Group[] = [];

  choice: Choice[] = [];

  sequence: Sequence[] = [];

  any: Any[] = [];
}

export class Any {
  static tagName = 'xs:any';

  private readonly _kind = 'Any';

  constructor(options: Any) {
    this.$maxOccurs = options.$maxOccurs ?? this.$maxOccurs;
    this.$minOccurs = options.$minOccurs ?? this.$minOccurs;
    this.$namespace = options.$namespace;
    this.$processContents = options.$processContents;
    this.annotation = options.annotation;
  }

  $maxOccurs = 1;

  $minOccurs = 1;

  $namespace: void;

  $processContents: void;

  annotation?: Annotation;
}
