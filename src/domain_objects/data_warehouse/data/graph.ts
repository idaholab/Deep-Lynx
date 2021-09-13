import { BaseDomainClass } from '../../../common_classes/base_domain_class';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';
/*
    Graph represents a graph record in the Deep Lynx database and the various
    validations required for said record to be considered valid - the secondary
    class is for managing which graph is considered active given a containerID.
 */
export default class Graph extends BaseDomainClass {
    @IsUUID()
    @IsOptional()
    id?: string;

    @IsUUID()
    container_id?: string;

    @IsBoolean()
    @IsOptional()
    archived = false;
}

export class ActiveGraph extends BaseDomainClass {
    @IsUUID()
    container_id?: string;

    @IsUUID()
    graph_id?: string;
}
