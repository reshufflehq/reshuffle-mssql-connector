import mssql, { ISqlType, Transaction } from 'mssql'
import { Reshuffle, BaseConnector } from 'reshuffle-base-connector'

type Options = Record<string, any>
type inputParam = { name: string, type?: ISqlType, value: any }

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

  // Your actions
  sdk() {
    return this.client
  }

  public async close(): Promise<void> {
    await this.pool.close()
  }  

  public async query(sql: string, params?: inputParam[]): Promise<any> {
    try {
      if(!this.pool.connected) {
        await this.pool.connect() 
      }
      const request = this.pool.request()
      if(params && params.length > 0) {
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
        fields: rows.recordset.columns,
        rows: rows.recordset,
        rowCount: rows.recordset.length,
      }
    } catch (error) {
      this.app.getLogger().error(error)
    }
  }

  public async transaction(seq: Sequence) {
    if(!this.pool.connected) {
      await this.pool.connect() 
    }
    const transaction = new this.client.Transaction(this.pool)
    try {
      await transaction.begin()
      // const request = new this.client.Request(transaction)
      const ret = await seq(this.queryRequest.bind(this, transaction))
      await transaction.commit()
      return ret
    } catch (error) {
      this.app.getLogger().error(error)
      await transaction.rollback()
      throw error
    }
  }

  private async queryRequest(transaction: Transaction, sql: string, params?: inputParam[]) {
    try {
      const request = new this.client.Request(transaction)      
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
        fields: rows.recordset.columns,
        rows: rows.recordset,
        rowCount: rows.recordset.length,
      }
    } catch (error) {
      throw error
    }
  }
}

export { MSSQLConnector }
