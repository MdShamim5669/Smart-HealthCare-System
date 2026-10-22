import { IPaginationMeta, IQueryParams, IQueryResult } from "../interfaces/query.interface";

export type IQueryOptions = IQueryParams;
export { IPaginationMeta, IQueryResult };


interface IPrismaModelDelegate<T> {
    findMany: (args: any) => Promise<T[]>;
    count: (args: any) => Promise<number>;
}

export class QueryBuilder<T> {
    private model: IPrismaModelDelegate<T>;
    private query: IQueryOptions;
    private prismaQuery: {
        where: Record<string, any>;
        include?: any;
        select?: any;
        skip?: number;
        take?: number;
        orderBy?: Record<string, "asc" | "desc">;
    };
    private page: number;
    private limit: number;

    constructor(model: IPrismaModelDelegate<T>, query: IQueryOptions = {}) {
        this.model = model;
        this.query = query;
        this.page = Number(query.page) > 0 ? Number(query.page) : 1;
        this.limit = Number(query.limit) > 0 ? Number(query.limit) : 10;
        this.prismaQuery = {
            where: {
                AND: [],
            },
        };
    }

    /**
     * Add static/default where conditions (e.g. { isDeleted: false })
     */
    where(condition: Record<string, any>): this {
        if (!this.prismaQuery.where.AND) {
            this.prismaQuery.where.AND = [];
        }
        this.prismaQuery.where.AND.push(condition);
        return this;
    }

    /**
     * Search across specified string fields using insensitive pattern matching
     */
    search(searchableFields: string[]): this {
        const searchTerm = this.query.searchTerm?.trim();
        if (searchTerm && searchableFields.length > 0) {
            const orConditions = searchableFields.map((field) => {
                if (field.includes(".")) {
                    const [relation, nestedField] = field.split(".");
                    return {
                        [relation]: {
                            [nestedField]: {
                                contains: searchTerm,
                                mode: "insensitive",
                            },
                        },
                    };
                }
                return {
                    [field]: {
                        contains: searchTerm,
                        mode: "insensitive",
                    },
                };
            });

            if (!this.prismaQuery.where.AND) {
                this.prismaQuery.where.AND = [];
            }
            this.prismaQuery.where.AND.push({ OR: orConditions });
        }
        return this;
    }

    /**
     * Filter dynamically excluding reserved query parameters
     */
    filter(excludeFields: string[] = []): this {
        const reservedKeys = [
            "searchTerm",
            "page",
            "limit",
            "sortBy",
            "sortOrder",
            "fields",
            ...excludeFields,
        ];

        const queryObj = { ...this.query };
        reservedKeys.forEach((key) => delete queryObj[key]);

        const filterConditions: Record<string, any>[] = [];

        Object.keys(queryObj).forEach((key) => {
            const value = queryObj[key];
            if (value !== undefined && value !== null && value !== "") {
                if (value === "true") {
                    filterConditions.push({ [key]: true });
                } else if (value === "false") {
                    filterConditions.push({ [key]: false });
                } else {
                    filterConditions.push({ [key]: value });
                }
            }
        });

        if (filterConditions.length > 0) {
            if (!this.prismaQuery.where.AND) {
                this.prismaQuery.where.AND = [];
            }
            this.prismaQuery.where.AND.push(...filterConditions);
        }

        return this;
    }

    /**
     * Order records by specified field and direction
     */
    sort(defaultSortBy = "createdAt", defaultSortOrder: "asc" | "desc" = "desc"): this {
        const sortBy = (this.query.sortBy as string) || defaultSortBy;
        const sortOrder = (this.query.sortOrder as "asc" | "desc") || defaultSortOrder;

        this.prismaQuery.orderBy = {
            [sortBy]: sortOrder,
        };

        return this;
    }

    /**
     * Paginate results with page and limit
     */
    paginate(): this {
        const skip = (this.page - 1) * this.limit;
        this.prismaQuery.skip = skip;
        this.prismaQuery.take = this.limit;
        return this;
    }

    /**
     * Include Prisma relations
     */
    include(includeConfig: any): this {
        this.prismaQuery.include = includeConfig;
        return this;
    }

    /**
     * Select specific Prisma fields
     */
    select(selectConfig: any): this {
        this.prismaQuery.select = selectConfig;
        return this;
    }

    /**
     * Retrieve the constructed Prisma query object
     */
    getQuery(): typeof this.prismaQuery {
        const where = { ...this.prismaQuery.where };
        if (where.AND && where.AND.length === 0) {
            delete where.AND;
        }
        return {
            ...this.prismaQuery,
            where,
        };
    }

    /**
     * Execute the query and return data with pagination metadata
     */
    async execute(): Promise<IQueryResult<T>> {
        const queryConfig = this.getQuery();

        const [data, total] = await Promise.all([
            this.model.findMany(queryConfig),
            this.model.count({ where: queryConfig.where }),
        ]);

        const totalPage = Math.ceil(total / this.limit) || 1;

        return {
            meta: {
                page: this.page,
                limit: this.limit,
                total,
                totalPage,
            },
            data,
        };
    }

    /**
     * Execute count only
     */
    async count(): Promise<number> {
        const queryConfig = this.getQuery();
        return await this.model.count({ where: queryConfig.where });
    }
}

export default QueryBuilder;
