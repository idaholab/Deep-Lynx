import * as t from 'io-ts'
import {date} from 'io-ts-types/lib/date'

const avevaElement = t.type({
    Id: t.number,
    FullId: t.string,
    Name: t.string,
    Type: t.string,
    IsValid: t.string,
    Operation: t.string,
    PreviousElementId: t.string,
    NextElementId: t.string,
})

const avevaAttribute = t.type({
    Name: t.string,
    Description: t.string,
    Attributes: t.unknown
})

const avevaElementTMeta = t.type({
    Children: t.array(t.unknown),
    Attributes: t.array(avevaAttribute)
})

export const avevaElementT = t.intersection([avevaElement, avevaElementTMeta])
export const avevaElementsT = t.array(avevaElementT)

export type AvevaElementT = t.TypeOf<typeof avevaElementT>
export type AvevaElementsT = t.TypeOf<typeof  avevaElementsT>
