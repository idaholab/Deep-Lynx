import Result from '../../../../common_classes/result';
import Mapper from '../../mapper';
import {PoolClient, QueryConfig} from 'pg';
import Node, {NodeLeaf} from '../../../../domain_objects/data_warehouse/data/node';
import {NodeFile} from '../../../../domain_objects/data_warehouse/data/file';
import Report from '../../../../domain_objects/data_warehouse/data/report';

const format = require('pg-format');
const resultClass = Report;

/*
    ReportMapper extends the Postgres database Mapper class and allows the user
    to map a data structure to and from the attached database. The mappers are
    designed to be as simple as possible and shouldn't contain things like
    validation or transformation of the data prior to storage - those operations
    should live in a Repository or on the data structure's class itself. Also try
    to avoid listing functions, as those are generally covered by the Repository
    class/interface as well.
*/
export default class ReportMapper extends Mapper {
    public static tableName = 'reports';
    
    private static instance: ReportMapper;

    public static get Instance(): ReportMapper {
        if (!ReportMapper.instance) {
            ReportMapper.instance = new ReportMapper();
        }

        return ReportMapper.instance;
    }

    
}