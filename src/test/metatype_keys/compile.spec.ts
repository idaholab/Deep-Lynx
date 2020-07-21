/* tslint:disable */
import * as t from 'io-ts'
import {assert, expect} from 'chai'
import {fold} from "fp-ts/lib/Either";
import {pipe} from "fp-ts/lib/pipeable";
import {CompileMetatypeKeys, MetatypeKeyT} from "../../types/metatype_keyT";
import {failure} from "io-ts/lib/PathReporter";
import {MetatypeT} from "../../types/metatypeT";

// failure handler
const onLeft = (errors: t.Errors): string => {
    console.log(`${errors.length} error(s) found ${failure(errors)} `);

    return `${errors.length} error(s) found ${failure(errors)}`
};

const onLeftFail = (errors: t.Errors): string => {
    console.log(`${errors.length} error(s) found ${failure(errors)} `);
    expect(true).false

    return `${errors.length} error(s) found ${failure(errors)}`
};

// success handler
const onRight = (s: any) => {
    return ""
};


describe('Compiled Metatypes should', async() => {
    it('pass valid payload', (done) => {
        pipe(CompileMetatypeKeys(test_keys).decode(payload), fold(onLeft, onRight));
        done()
    });

    it('fail malformed payloads', (done) => {
        pipe(CompileMetatypeKeys(test_keys).decode(malformed_payload), fold(onLeft, onRight));
        done()
    });

    it('fail malformed payloads: failing regex', (done) => {
        pipe(CompileMetatypeKeys(test_keys).decode(malformed_payload_regex), fold(onLeftFail, onRight));
        done()
    });
});


const payload: {[key:string]:any} = {
    "flower": "Daisy",
    "color": "yellow",
    "notRequired": 1
};

const malformed_payload_regex: {[key:string]:any} = {
    "flower": "",
    "color": "yellow",
    "notRequired": 1
};


const malformed_payload: {[key:string]:any} = {
    "flower": "Daisy",
    "notRequired": 1
};

export const test_keys: MetatypeKeyT[] = [{
    name: "Test",
    property_name: "flower",
    required: true,
    description: "flower name",
    data_type: "string"
},
    {
        name: "Test 2",
        property_name: "color",
        required: true,
        description: "color of flower allowed",
        data_type: "enumeration",
        options: ["yellow", "blue"]
    },
    {
        name: "Test Not Required",
        property_name: "notRequired",
        required: false,
        description: "not required",
        data_type: "number",
        validation: {
            regex: '/\\S+/'
        }
    },
];

export const single_test_key: MetatypeKeyT = {
    name: "Test Not Required",
    property_name: "notRequired",
    required: false,
    description: "not required",
    data_type: "number",
};

export const single_test_key_regex: MetatypeKeyT = {
    name: "Test Not Required",
    property_name: "notRequired",
    required: false,
    description: "not required",
    data_type: "number",
    validation: {
        regex: '/\\S+/'
    }
};


const metatype: MetatypeT = {
   "name": "Test Metatype",
   "description": "For Node Testing",
   "id": "219123oasdfliuasdf",
    "container_id": "test"
};
