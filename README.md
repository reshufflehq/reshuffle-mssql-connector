# reshuffle-mssql-connector

[Code](https://github.com/reshufflehq/reshuffle-mssql-connector) |
[npm](https://www.npmjs.com/package/reshuffle-mssql-connector) |
[Code sample](https://github.com/reshufflehq/reshuffle-mssql-connector/tree/master/examples)

`npm install reshuffle-mssql-connector`

### Reshuffle MSSQL Connector

This package contains a [Reshuffle](https://github.com/reshufflehq/reshuffle)
connector to MSSQL databases.

The connector uses [Node MSSQL Client](https://www.npmjs.com/package/mssql) package.

The following example lists user's information from the "users" table:

```js
const { Reshuffle } = require('reshuffle')
const { MSSQLConnector } = require('reshuffle-mssql-connector')

  const app = new Reshuffle()
  const mssql = new MSSQLConnector(app, {
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  })

  const result = await mssql.query("SELECT * FROM Users where firstName = 'John'")
  console.log('rows: ',result.rows)
  console.log('fields: ',result.fields)
  console.log('rowCount: ',result.rowCount)

```

#### Table of Contents

[Configuration](#configuration) Configuration options

_Connector actions_:

[close](#close) Close all active connections

[query](#query) Run a single query on the database

[transaction](#transaction) Run a transaction on the database


[getConenctionPool](#getConenctionPool) Retrieve the `ConnectionPool` for the database
 
[sdk](#sdk) Retrieve the client sdk object with support of Promise API

##### <a name="configuration"></a>Configuration options

```js

const app = new Reshuffle();
const mssql = new MSSQLConnector(app, {
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME 
})
```

For more information about connection attributes check the [node-mssql](https://www.npmjs.com/package/mssql#general-same-for-all-drivers) documentation.


#### Connector actions

##### <a name="close"></a>Close action

```js
await mssql.close()
```

Close all connections to the database. If an application terminates without
calling close, it might hang for a few seconds until active connections
time out.

##### <a name="query"></a>Query action


```js
await mssql.query("INSERT INTO users VALUES ('John', 'Coltrane', 42)")

const family = await mssql.query(
  "SELECT firstName, lastName, age FROM users WHERE lastName='Coltrane'"
)

const avgResponse = await mssql.query(
  "SELECT average(age) AS avg FROM users WHERE lastName='Coltrane'"
)
const averageAge = avgResponse.rows[0].avg

```

The `query` action can be used to run _any_ SQL command on the connected
database (not just `SELECT`). The query is defined in the `sql` string. The
optional `params` can be used to generate parameterized queries, as shown in
the following example:

```js
const age = await mssql.query(
  "SELECT age FROM users WHERE firstName = @f_name and lastName = @l_name",
  [{name: 'f_name', value: 'John'}, {name: 'l_name', type: mssql.Text, value: 'Coltrane'}]
)
```
Note that the type is optional, if you omit type, [node-mssql](https://www.npmjs.com/package/mssql) automatically decides which SQL data type should be used based on JS data type.

This action returns an object with the results of the query, where
`fields` is an array of all fields metadata, as returned by the query.
Field names in a `SELECT` query are column names, or are specified
with an `AS` clause. Every element of `rows` uses the names in
`fields` as its object keys. For more details check this [link](https://www.npmjs.com/package/mssql#metadata).


Note that every call to `query` may use a different database connection.
To ensure a set of queries are all run using the same connection, use the [transaction](#transaction) action.

##### <a name="transaction"></a>Transaction action


```js
await mssql.transaction(async (query) => {
  const res = await query("SELECT COUNT(*) as count FROM users")
  const userCount = res.rows[0].count
  if (100 <= userCount) {
    throw new Error('Too many users:', userCount)
  }
  return query("INSERT INTO users VALUES ('Charlie', 'Parker', 49)")
})
```

Use `transaction` to run multiple queries as an atomic SQL transaction.
If any of the queries fail, all queries are rolled back and an error is thrown.

Consider, for example, the following code for updating a bank account
balance:

```js
  const accountId = 289
  const change = 1000
  const accountChangeData = [{name: 'change', value: change}, {name: 'accountId', type: mssql.Int, value: accountId}]

  mssql.transaction(async (query) => {
    await query(`
      UPDATE accounts
        SET balance = balance + @change
        WHERE account_id = @accountId
      `, accountChangeData,
    )
    await query(`
      INSERT INTO accounts_log(account_id, change, time)
        VALUES (@accountId, @change, current_timestamp)
      `, accountChangeData,
    )
  })
```


##### <a name="getConenctionPool"></a>Get a Conenction Pool for the database
Get the ConnectionPool that was created when MSSQLConnector was created using the Configuration options

```js
const pool = mssql.getConenctionPool()

const result = await pool.query('SELECT * FROM Users')
console.log('rows: ',result.recordset)
console.log('fields: ',result.recordset.columns)
console.log('rowCount: ',result.rowsAffected[0])

```


##### <a name="sdk"></a>Full access to the MSSQL Client SDK


```js
const sdk = mssql.sdk()

const connection = await mssql.sdk().createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME 
})

const result = await connection.execute('SELECT * FROM Users')
console.log('rows: ',result.recordset)
console.log('fields: ',result.recordset.columns)
console.log('rowCount: ',result.rowsAffected[0])

```