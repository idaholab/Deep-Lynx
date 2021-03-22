import {registerDecorator, ValidationArguments, ValidationOptions} from "class-validator";
import Metatype from "../data_warehouse/ontology/metatype";
import MetatypeRelationship from "../data_warehouse/ontology/metatype_relationship";
import Container from "../data_warehouse/ontology/container";
import {User} from "../access_management/user";
import MetatypeRelationshipPair from "../data_warehouse/ontology/metatype_relationship_pair";
const validator = require('validator')


export function UserID(validationOptions?: ValidationOptions) {
    return (object: object, propertyName: string) => {
        registerDecorator({
            name: 'UserID',
            target: object.constructor,
            propertyName,
            constraints: [],
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    return value instanceof User && validator.isUUID(value.id)
                },
            },
        });
    };
}

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


export function MetatypeRelationshipPairID(validationOptions?: ValidationOptions) {
    return (object: object, propertyName: string) => {
        registerDecorator({
            name: 'MetatypeRelationshipPairID',
            target: object.constructor,
            propertyName,
            constraints: [],
            options: validationOptions,
            validator: {
                validate(value: any, args: ValidationArguments) {
                    return value instanceof MetatypeRelationshipPair && validator.isUUID(value.id)
                },
            },
        });
    };
}
