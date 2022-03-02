import {BaseDomainClass} from '../../../common_classes/base_domain_class';
import {IsBoolean, IsDate, IsIn, IsNotEmpty, IsOptional, IsString, MinLength, registerDecorator, ValidationArguments, ValidationOptions} from 'class-validator';
import {Expose, plainToClass, Transform, Type} from 'class-transformer';
import Metatype, {MetatypeID} from './metatype';
import MetatypeRelationship, {MetatypeRelationshipID} from './metatype_relationship';

/*
    MetatypeRelationshipPair  represents a metatype relationship pair  record in
    the Deep Lynx database and the various validations required for said record
    to be considered valid. It also contain operations for managing the pair's
    origin/destination and pair type.
 */
export default class MetatypeRelationshipPair extends BaseDomainClass {
    @IsOptional()
    @IsString()
    id?: string;

    @IsString()
    container_id?: string;

    @IsOptional()
    @IsBoolean()
    archived?: boolean;

    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    name = '';

    @IsNotEmpty()
    @IsString()
    description = '';

    // in order to support the data structure we need additional transformation
    // functions to take the database value and create an empty metatype for it
    // this is done because the record in the database has only the id values, we
    // want the domain object to have the origin/destination/relationship as classes
    // we set toClassOnly as true because want the serialized version of this model
    // to contain the classes. We also have getters for the ID  and type
    // in order to maintain backwards compatibility with old API responses
    @MetatypeID({message: 'Destination Metatype must have valid ID'})
    @Expose({name: 'destination_metatype_id', toClassOnly: true})
    @Transform(
        ({value}) => {
            const metatype = plainToClass(Metatype, {});
            metatype.id = value;
            return metatype;
        },
        {toClassOnly: true},
    )
    destinationMetatype: Metatype | undefined;

    @Expose({toPlainOnly: true})
    get destination_metatype_id(): string {
        return this.destinationMetatype!.id!;
    }

    @Expose({name: 'destination_metatype', toPlainOnly: true})
    private get _destination(): Metatype {
        return this.destinationMetatype!;
    }

    @MetatypeID({message: 'Origin Metatype must have valid ID'})
    @Expose({name: 'origin_metatype_id', toClassOnly: true})
    @Transform(
        ({value}) => {
            const metatype = plainToClass(Metatype, {});
            metatype.id = value;
            return metatype;
        },
        {toClassOnly: true},
    )
    originMetatype: Metatype | undefined;

    @Expose({toPlainOnly: true})
    get origin_metatype_id(): string {
        return this.originMetatype!.id!;
    }

    @Expose({name: 'origin_metatype', toPlainOnly: true})
    private get _origin(): Metatype {
        return this.originMetatype!;
    }

    @MetatypeRelationshipID({
        message: 'Metatype Relationship must have valid ID',
    })
    @Expose({name: 'relationship_id', toClassOnly: true})
    @Transform(
        ({value}) => {
            const relationship = plainToClass(MetatypeRelationship, {});
            relationship.id = value;
            return relationship;
        },
        {toClassOnly: true},
    )
    relationship: MetatypeRelationship | undefined;

    @Expose({toPlainOnly: true})
    get relationship_id(): string {
        return this.relationship!.id!;
    }

    @Expose({name: 'relationship', toPlainOnly: true})
    private get _relationship(): MetatypeRelationship {
        return this.relationship!;
    }

    @IsNotEmpty()
    @IsString()
    @IsIn(['many:many', 'one:one', 'one:many', 'many:one'])
    relationship_type = 'many:many';

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    deleted_at?: Date;

    constructor(input: {
        name: string;
        description: string;
        relationship_type: string;
        origin_metatype: Metatype | string; // we will also accept ids in place of classes
        destination_metatype: Metatype | string;
        relationship: MetatypeRelationship | string;
        container_id?: string;
    }) {
        super();

        if (input) {
            this.name = input.name;
            this.description = input.description;
            this.relationship_type = input.relationship_type;
            // we also accept string id's in place of full classes as a backwards
            // compatibility issue
            input.origin_metatype instanceof Metatype
                ? (this.originMetatype = input.origin_metatype)
                : (this.originMetatype = plainToClass(Metatype, {
                      id: input.origin_metatype,
                  }));
            input.destination_metatype instanceof Metatype
                ? (this.destinationMetatype = input.destination_metatype)
                : (this.destinationMetatype = plainToClass(Metatype, {
                      id: input.destination_metatype,
                  }));
            input.relationship instanceof MetatypeRelationship
                ? (this.relationship = input.relationship)
                : (this.relationship = plainToClass(MetatypeRelationship, {
                      id: input.relationship,
                  }));

            if (input.container_id) this.container_id = input.container_id;
        }
    }
}

// any specific validators should be specified here
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
                    return value instanceof MetatypeRelationshipPair && typeof value.id! === 'string';
                },
            },
        });
    };
}
