import {BaseDomainClass} from "../../common_classes/base_domain_class";
import {IsBoolean, IsOptional, IsUUID} from "class-validator";

export default class Graph extends BaseDomainClass {
   @IsUUID()
   @IsOptional()
   id?: string

   @IsUUID()
   container_id?: string

   @IsBoolean()
   @IsOptional()
   archived: boolean = false
}

export class ActiveGraph extends BaseDomainClass {
   @IsUUID()
   container_id?: string

   @IsUUID()
   graph_id?: string
}
