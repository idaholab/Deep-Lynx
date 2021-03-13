import {BaseDataClass} from "../../base_data_class";
import {IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength} from "class-validator";
import {Expose, plainToClass, Transform} from "class-transformer"
import Metatype from "./metatype";
import MetatypeRelationship from "./metatype_relationship";
import {MetatypeID, MetatypeRelationshipID} from "../../validators";

export default class MetatypeRelationshipPair extends BaseDataClass {
    @IsOptional()
    @IsUUID()
    id?: string

    @IsUUID()
    container_id?: string

    @IsOptional()
    @IsBoolean()
    archived?: boolean

    @IsNotEmpty()
    @IsString()
    @MinLength(1)
    name: string = ""

    @IsNotEmpty()
    @IsString()
    description: string = ""

    // in order to support the data structure we need additional transformation
    // functions to take the database value and create an empty metatype for it
    // this is done because the record in the database has only the id values, we
    // want the domain object to have the origin/destination/relationship as classes
    // we set toClassOnly as true because want the serialized version of this model
    // to contain the classes. We also have getters for the ID  and type
    // in order to maintain backwards compatibility with old API responses
    @MetatypeID({message: "Destination Metatype must have valid ID"})
    @Expose({name: "destination_metatype_id", toClassOnly: true})
    @Transform(({value}) => {
        const metatype = plainToClass(Metatype, {})
        metatype.id = value
        return metatype
    }, {toClassOnly: true})
    destinationMetatype: Metatype | undefined

    @Expose({toPlainOnly: true})
    get destination_metatype_id(): string {
        return this.destinationMetatype!.id!
    }

    @Expose({name:"destination_metatype", toPlainOnly:true})
    private get _destination(): Metatype {
        return this.destinationMetatype!
    }


    @MetatypeID({message: "Origin Metatype must have valid ID"})
    @Expose({name: "origin_metatype_id", toClassOnly: true})
    @Transform(({value}) => {
        const metatype = plainToClass(Metatype, {})
        metatype.id = value
        return metatype
    }, {toClassOnly: true})
    originMetatype: Metatype | undefined

    @Expose({toPlainOnly: true})
    get origin_metatype_id(): string {
        return this.originMetatype!.id!
    }

    @Expose({name:"origin_metatype", toPlainOnly:true})
    private get _origin(): Metatype {
        return this.destinationMetatype!
    }


    @MetatypeRelationshipID({message: "Origin Metatype must have valid ID"})
    @Expose({name: "relationship_id", toClassOnly: true})
    @Transform(({value}) => {
        const relationship = plainToClass(MetatypeRelationship, {})
        relationship.id = value
        return relationship
    }, {toClassOnly: true})
    relationship: MetatypeRelationship | undefined

    @Expose({toPlainOnly: true})
    get relationship_id(): string {
        return this.relationship!.id!
    }

    @Expose({name:"relationship", toPlainOnly:true})
    private get _relationship(): MetatypeRelationship {
        return this.relationship!
    }

    @IsNotEmpty()
    @IsString()
    @IsIn(["many:many", "one:one", "one:many", "many:one"])
    relationship_type: string = "many:many"

    constructor(input: {
        name: string,
        description: string,
        relationshipType: string,
        originMetatype: Metatype | string, // we will also accept ids in place of classes
        destinationMetatype: Metatype | string,
        relationship: MetatypeRelationship | string,
        containerID?: string}) {
        super();

        if(input) {
            this.name = input.name
            this.description = input.description
            this.relationship_type = input.relationshipType;
            // we also accept string id's in place of full classes as a backwards
            // compatibility issue
            (input.originMetatype instanceof Metatype) ? this.originMetatype = input.originMetatype as Metatype : this.originMetatype = plainToClass(Metatype, {id: input.originMetatype});
            (input.destinationMetatype instanceof Metatype) ? this.destinationMetatype = input.destinationMetatype as Metatype : this.destinationMetatype = plainToClass(Metatype, {id: input.destinationMetatype});
            (input.relationship instanceof MetatypeRelationship) ? this.relationship = input.relationship as MetatypeRelationship : this.relationship = plainToClass(MetatypeRelationship, {id: input.relationship});

            if(input.containerID) this.container_id = input.containerID
        }
    }
}
