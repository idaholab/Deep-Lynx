import { Type } from "class-transformer";
import { IsDefined, IsIn, IsOptional, IsString, ValidateNested } from "class-validator";
import { BaseDomainClass, NakedDomainClass } from "../../common_classes/base_domain_class";
import { User } from "../access_management/user";

export class BaseTaskConfig extends NakedDomainClass {
    kind: 'hpc' = 'hpc';
}

export class HpcTaskConfig extends BaseTaskConfig {
    kind: 'hpc' = 'hpc';

    @ValidateNested()
    user?: User

    constructor(input: {
        user: User;
    }) {
        super();

        if (input) {
            this.user = input.user;
        }
    }
}

export default class TaskRecord extends BaseDomainClass {
    @IsOptional()
    id?: string;

    @IsString()
    container_id?: string;

    @IsString()
    @IsIn(['hpc'])
    task_type = 'hpc';

    @IsString()
    @IsIn(['ready', 'working', 'completed', 'error', 'canceled'])
    status?: 'ready' | 'working' | 'completed' | 'error' | 'canceled' = 'ready';

    @IsOptional()
    @IsString()
    status_message?: string;

    @IsOptional()
    @IsString()
    query?: string;

    @IsOptional()
    @IsDefined()
    data?: any;

    @ValidateNested()
    @Type(() => BaseTaskConfig, {
        keepDiscriminatorProperty: true,
        discriminator: {
            property: 'kind',
            subTypes: [
                {value: HpcTaskConfig, name: 'hpc'},
            ],
        },
    })
    config?: BaseTaskConfig | HpcTaskConfig;

    constructor(input: {
        container_id: string;
        task_type: string;
        status?: 'ready' | 'working' | 'completed' | 'error' | 'canceled';
        status_message?: string;
        query?: string;
        data?: any;
        config?: BaseTaskConfig;
    }) {
        super();

        if (input) {
            this.container_id = input.container_id;
            this.task_type = input.task_type;
            if (input.status) this.status = input.status;
            if (input.status_message) this.status_message = input.status_message;
            if (input.query) this.query = input.query;
            if (input.data) this.data = input.data;
            if (input.config) this.config = input.config;
        }
    }
}
