import {registerDecorator, ValidationArguments, ValidationOptions} from "class-validator";
import Metatype from "../data_warehouse/ontology/metatype";
import MetatypeRelationship from "../data_warehouse/ontology/metatype_relationship";
const validator = require('validator')

export function MetatypeID(validationOptions?: ValidationOptions) {
    return (object: object, propertyName: string) => {
        registerDecorator({
            name: 'MetatypeID',
            target: object.constructor,
            propertyName,
            constraints: [],
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    return value instanceof Metatype && validator.isUUID(value.id)
                },
            },
        });
    };
}

export function MetatypeRelationshipID(validationOptions?: ValidationOptions) {
    return (object: object, propertyName: string) => {
        registerDecorator({
            name: 'MetatypeRelationshipID',
            target: object.constructor,
            propertyName,
            constraints: [],
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    return value instanceof MetatypeRelationship && validator.isUUID(value.id)
                },
            },
        });
    };
}