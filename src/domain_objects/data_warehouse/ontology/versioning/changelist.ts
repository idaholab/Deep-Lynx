import {BaseDomainClass, NakedDomainClass} from '../../../../common_classes/base_domain_class';
import {IsDate, IsIn, IsObject, IsOptional, IsString} from 'class-validator';
import {Type} from 'class-transformer';

/*
    Changelist represents a list of changes to be applied, or already applied to the
    existing ontology. It is used to help manage ontology versions
 */
export default class Changelist extends BaseDomainClass {
    @IsOptional()
    @IsString()
    id?: string;

    @IsString()
    container_id?: string;

    @IsString()
    name?: string;

    @IsString()
    @IsIn(['pending', 'approved', 'rejected', 'applied', 'deprecated', 'ready'])
    status = 'pending';

    @IsObject()
    changelist: object = {};

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    applied_at?: Date;

    constructor(input: {container_id: string; name: string; changelist?: object; status?: string; applied_at?: Date}) {
        super();

        if (input) {
            this.container_id = input.container_id;
            this.name = input.name;
            if (input.changelist) this.changelist = input.changelist;
            if (input.status) this.status = input.status;
            if (input.applied_at) this.applied_at = input.applied_at;
        }
    }
}

export class ChangelistApproval extends NakedDomainClass {
    @IsOptional()
    @IsString()
    id?: string;

    @IsString()
    changelist_id?: string;

    @IsString()
    approved_by?: string;

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    approved_at?: Date;

    constructor(input: {changelist_id: string; approver_id: string; approved_at?: Date}) {
        super();

        if (input) {
            this.changelist_id = input.changelist_id;
            this.approved_by = input.approver_id;
            if (input.approved_at) this.approved_at = input.approved_at;
        }
    }
}
