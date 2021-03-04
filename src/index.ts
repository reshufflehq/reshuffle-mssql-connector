import mssql, { ISqlType, Request } from 'mssql'
import { Reshuffle, BaseConnector } from 'reshuffle-base-connector'

type Options = Record<string, any>
type InputParam = { name: string, type?: ISqlType, value: any }

export type Query = (sql: string, params?: any[]) => Promise<any>
export type Sequence = (query: Query) => Promise<any>

export default class MSSQLConnector extends BaseConnector {
  private client: typeof mssql
  private pool: mssql.ConnectionPool

  constructor(app: Reshuffle, options: Options = {}, id?: string) {
    super(app, options, id)
    this.client = mssql
    if (!options) {
      throw new Error('Empty connection config')
    }
    this.pool = new this.client.ConnectionPool(this.configOptions)
  }

  onStop(): void {
    this.close()
  }

  // Your actions
  getConenctionPool() {
    return this.pool
  }

  sdk() {
    return this.client
  }

  public async close(): Promise<void> {
    await this.pool.close()
  }  

  public async query(sql: string, params?: InputParam[]): Promise<any> {
    await this.ensureConnection()
    const request = this.pool.request()
    return await this.queryRequest(request, sql, params)
  }

  public async transaction(seq: Sequence) {
    await this.ensureConnection()
    
    const transaction = new this.client.Transaction(this.pool)
    try {
      await transaction.begin()
      const ret = await seq(this.queryRequest.bind(this, 
        new this.client.Request(transaction)))
      await transaction.commit()
      return ret
    } catch (error) {
      this.app.getLogger().error(error)
      await transaction.rollback()
      throw error
    }
  }

  private async ensureConnection() {
    if(!this.pool.connected) {
      await this.pool.connect() 
    }
  }

  private async queryRequest(request: Request, sql: string, params?: InputParam[]) {
    try {
      // Clean the paramters to avoid case of: 
      // "The parameter name has already been declared. Parameter names must be unique"
      request.parameters = {}

      if (params && params.length > 0) {
        params.map( param => {
          if(param.type) {
            request.input(param.name, param.type, param.value)
          } else {
            request.input(param.name, param.value)
          }
        })
      }
      const rows = await request.query(sql)
      return {
        fields: rows.recordset === undefined ? '' : rows.recordset.columns,
        rows: rows.recordset,
        rowCount: rows.rowsAffected[0],
      }
    } catch (error) {
      this.app.getLogger().error(error)
      throw error
    }
  }
}

export { MSSQLConnector }
