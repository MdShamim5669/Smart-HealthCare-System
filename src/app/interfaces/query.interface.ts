export interface IQueryParams {
    page?: number | string;
    limit?: number | string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
    searchTerm?: string;
    [key: string]: any;
}

export interface IPaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPage: number;
}

export interface IQueryResult<T> {
    meta: IPaginationMeta;
    data: T[];
}
