import {BaseDomainClass} from '../../../common_classes/base_domain_class';
import {IsBoolean, IsNumber, IsObject, IsOptional, IsString, IsUUID, ValidateIf} from 'class-validator';
import {Expose, plainToClass, Transform} from 'class-transformer';
import Metatype, {MetatypeID} from '../ontology/metatype';
import Container from '../ontology/container';
import Edge from './edge';

/*
    Node represents a node record in the Deep Lynx database and the various
    validations required for said record to be considered valid.
 */
export default class Node extends BaseDomainClass {
    @IsOptional()
    @IsUUID()
    id?: string;

    @IsUUID()
    container_id?: string;

    @IsOptional()
    @IsBoolean()
    archived?: boolean;

    // we often need the metatype's name, it's keys, or access to other properties
    // when we deal with nodes, so for ease of use we're going to use the whole
    // class, not just the id
    @MetatypeID({message: 'Metatype must have valid ID'})
    @Expose({name: 'metatype_id', toClassOnly: true})
    @Transform(
        ({value}) => {
            const metatype = plainToClass(Metatype, {});
            metatype.id = value;
            return metatype;
        },
        {toClassOnly: true},
    )
    metatype: Metatype | undefined;

    // these two getters are to maintain the original api response for nodes
    @Expose({toPlainOnly: true})
    get metatype_id(): string {
        return this.metatype ? this.metatype.id! : '';
    }

    @IsOptional()
    metatype_name?: string;

    @IsObject()
    properties: object = {};

    @IsString()
    @IsOptional()
    original_data_id?: string;

    @IsString()
    @IsOptional()
    composite_original_id?: string;

    @IsUUID()
    @IsOptional()
    import_data_id?: string;

    @IsNumber()
    @IsOptional()
    data_staging_id?: number;

    @ValidateIf((o) => typeof o.composite_original_id !== 'undefined' && o.composite_original_id !== null)
    @IsUUID()
    data_source_id?: string;

    @IsUUID()
    @IsOptional()
    type_mapping_transformation_id?: string;

    @IsUUID()
    graph_id?: string;

    constructor(input: {
        container_id: Container | string;
        metatype: Metatype | string;
        metatype_name?: string;
        properties: object;
        original_data_id?: string;
        composite_original_id?: string;
        archived?: boolean;
        import_data_id?: string;
        data_staging_id?: number;
        data_source_id?: string;
        type_mapping_transformation_id?: string;
        graph_id?: string;
    }) {
        super();

        if (input) {
            input.container_id instanceof Container ? (this.container_id = input.container_id.id) : (this.container_id = input.container_id);
            input.metatype instanceof Metatype
                ? (this.metatype = input.metatype)
                : (this.metatype = plainToClass(Metatype, {
                    id: input.metatype,
                }));
            if (input.metatype_name) this.metatype_name = input.metatype_name;
            this.properties = input.properties;
            if (input.original_data_id) this.original_data_id = input.original_data_id;
            if (input.composite_original_id) this.composite_original_id = input.composite_original_id;
            if (input.archived) this.archived = input.archived;
            if (input.import_data_id) this.import_data_id = input.import_data_id;
            if (input.data_staging_id) this.data_staging_id = input.data_staging_id;
            if (input.data_source_id) this.data_source_id = input.data_source_id;
            if (input.type_mapping_transformation_id) this.type_mapping_transformation_id = input.type_mapping_transformation_id;
            if (input.graph_id) this.graph_id = input.graph_id;
        }
    }
}

// type guard for differentiating an array of nodes from either array of nodes or edges
export function IsNodes(set: Node[] | Edge[]): set is Node[] {
    // technically an empty array could be a set of NodeT
    if (Array.isArray(set) && set.length === 0) return true;

    return set[0] instanceof Node;
}
