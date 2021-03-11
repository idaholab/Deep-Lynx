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
    name: string

    @IsNotEmpty()
    @IsString()
    description: string

    // in order to support the data structure we need additional transformation
    // functions to take the database value and create an empty metatype for it
    // this is done because the record in the database has only the id values, we
    // want the domain object to have the origin/destination/relationship as classes
    // we set toClassOnly as true because want the serialized version of this model
    // to contain the classes
    @MetatypeID({message: "Destination Metatype must have valid ID"})
    @Expose({name: "destination_metatype_id", toClassOnly: true})
    @Transform(({value}) => {
        const metatype = plainToClass(Metatype, {})
        metatype.id = value
        return metatype
    }, {toClassOnly: true})
    destinationMetatype: Metatype

    @MetatypeID({message: "Origin Metatype must have valid ID"})
    @Expose({name: "origin_metatype_id", toClassOnly: true})
    @Transform(({value}) => {
        const metatype = plainToClass(Metatype, {})
        metatype.id = value
        return metatype
    }, {toClassOnly: true})
    originMetatype: Metatype

    @MetatypeRelationshipID({message: "Origin Metatype must have valid ID"})
    @Expose({name: "relationship_id", toClassOnly: true})
    @Transform(({value}) => {
        const relationship = plainToClass(MetatypeRelationship, {})
        relationship.id = value
        return relationship
    }, {toClassOnly: true})
    relationship: MetatypeRelationship

    @IsNotEmpty()
    @IsString()
    @IsIn(["many:many", "one:one", "one:many", "many:one"])
    relationship_type: string

    constructor(name: string, description: string, relationshipType: string, originMetatype: Metatype, destinationMetatype: Metatype, relationship: MetatypeRelationship) {
        super();

        this.name = name
        this.description = description
        this.relationship_type = relationshipType
        this.originMetatype = originMetatype
        this.destinationMetatype = destinationMetatype
        this.relationship = relationship
    }

}
