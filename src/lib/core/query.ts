
export interface QueryWrapper {
    index: number,
    query_type: "has" | "not"
}

export const has = (index:number):QueryWrapper => ({
    index,
    query_type: "has"
})

export const not = (index:number):QueryWrapper => ({
    index,
    query_type: "not"
})