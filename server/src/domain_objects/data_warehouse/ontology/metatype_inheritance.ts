import {BaseDomainClass} from '../../../common_classes/base_domain_class';
import {IsNotEmpty, IsString} from 'class-validator';

/*
    MetatypeInheritance represents a metatypes_inheritance key record in the DeepLynx database and the various
    validations required for said record to be considered valid.
 */
export default class MetatypeInheritance extends BaseDomainClass {
    @IsNotEmpty()
    @IsString()
    parent_id?: string;

    @IsNotEmpty()
    @IsString()
    child_id?: string;

    constructor(input: {
        parent_id?: string;
        child_id?: string;
    }) {
        super();

        // we have to do this because class-transformer doesn't know to create
        // an object with our specifications for the parameter
        if (input) {
            if (input.parent_id) this.parent_id = input.parent_id;
            if (input.child_id) this.child_id = input.child_id;
        }
    }
}
