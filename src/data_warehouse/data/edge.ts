import {BaseDomainClass} from "../../base_domain_class";
import {IsBoolean, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, IsUUID, ValidateIf} from "class-validator";
import {Expose, plainToClass, Transform} from "class-transformer";
import Container from "../ontology/container";
import MetatypeRelationshipPair, {MetatypeRelationshipPairID} from "../ontology/metatype_relationship_pair";

export default class Edge extends BaseDomainClass {
    @IsOptional()
    @IsUUID()
    id?: string

    @IsUUID()
    container_id?: string

    @IsOptional()
    @IsBoolean()
    archived?: boolean

    // we often need the metatype's name, it's keys, or access to other properties
    // when we deal with nodes, so for ease of use we're going to use the whole
    // class, not just the id
    @MetatypeRelationshipPairID({message: "Metatype relationship pair must have valid ID"})
    @Expose({name:"relationship_pair_id", toClassOnly: true})
    @Transform(({value}) => {
        const p = plainToClass(MetatypeRelationshipPair, {})
        p.id = value
        return p
    }, {toClassOnly: true})
    metatypeRelationshipPair: MetatypeRelationshipPair | undefined

    // these two getters are to maintain the original api response for nodes
    @Expose({toPlainOnly: true})
    get relationship_pair_id(): string {
        return (this.metatypeRelationshipPair) ? this.metatypeRelationshipPair.id! : ""
    }

    @IsObject()
    properties: object = {}

    @IsString()
    @IsOptional()
    original_data_id?: string

    @IsString()
    @IsOptional()
    composite_original_id?: string

    @IsUUID()
    @IsOptional()
    import_data_id?: string

    @IsNumber()
    @IsOptional()
    data_staging_id?: number

    // if we have an composite id, we must provide a data source as we can only
    // guarantee uniqueness based on that combination of values
    @ValidateIf(o =>  typeof o.composite_original_id !== "undefined" && o.composite_original_id !== null)
    @IsUUID()
    data_source_id?: string

    @IsUUID()
    @IsOptional()
    type_mapping_transformation_id?: string // TODO: fetch the full type mapping object

    @IsUUID()
    graph_id?: string

    @ValidateIf(o => o.origin_node_composite_original_id === null && typeof o.origin_node_composite_original_id === "undefined")
    @IsUUID()
    origin_node_id?: string

    @ValidateIf(o => o.destination_node_composite_original_id === null && typeof o.destination_node_composite_original_id === "undefined")
    @IsUUID()
    destination_node_id?: string

    @ValidateIf(o => o.origin_node_id === null && typeof o.origin_node_id === "undefined")
    @IsString()
    @IsNotEmpty()
    origin_node_composite_original_id?: string

    @ValidateIf(o => o.destination_node_id === null && typeof o.destination_node_id === "undefined")
    @IsString()
    @IsNotEmpty()
    destination_node_composite_original_id?: string

    @IsString()
    @IsOptional()
    origin_node_original_id?: string

    @IsString()
    @IsOptional()
    destination_node_original_id?: string

    constructor(input: {
        container_id: Container | string,
        metatype_relationship_pair: MetatypeRelationshipPair | string,
        metatype_name?: string,
        properties: object,
        original_data_id?: string,
        composite_original_id?: string,
        archived?: boolean,
        import_data_id?: string,
        data_staging_id?: number,
        data_source_id?: string,
        type_mapping_transformation_id?: string,
        graph_id?: string,
        origin_node_id?: string,
        destination_node_id?: string,
        origin_node_composite_original_id?: string,
        destination_node_composite_original_id?: string,
        origin_node_original_id?: string,
        destination_node_original_id?: string,
    }) {
        super();

        if(input) {
            (input.container_id instanceof Container) ? this.container_id = input.container_id.id : this.container_id = input.container_id as string
            if (input.metatype_relationship_pair instanceof MetatypeRelationshipPair) {
                this.metatypeRelationshipPair = input.metatype_relationship_pair as MetatypeRelationshipPair
            } else this.metatypeRelationshipPair = plainToClass(MetatypeRelationshipPair, {id: input.metatype_relationship_pair})
            this.properties = input.properties
            if(input.original_data_id) this.original_data_id = input.original_data_id
            if(input.composite_original_id) this.composite_original_id = input.composite_original_id
            if(input.archived) this.archived = input.archived
            if(input.import_data_id) this.import_data_id = input.import_data_id
            if(input.data_staging_id) this.data_staging_id = input.data_staging_id
            if(input.data_source_id) this.data_source_id = input.data_source_id
            if(input.type_mapping_transformation_id) this.type_mapping_transformation_id = input.type_mapping_transformation_id
            if(input.graph_id) this.graph_id = input.graph_id
            if(input.origin_node_id) this.origin_node_id = input.origin_node_id
            if(input.destination_node_id) this.destination_node_id = input.destination_node_id
            if(input.origin_node_composite_original_id) this.origin_node_composite_original_id = input.origin_node_composite_original_id
            if(input.origin_node_original_id) this.origin_node_original_id = input.origin_node_original_id
            if(input.destination_node_composite_original_id) this.destination_node_composite_original_id = input.destination_node_composite_original_id
            if(input.destination_node_original_id) this.destination_node_original_id = input.destination_node_original_id
        }
    }

}
