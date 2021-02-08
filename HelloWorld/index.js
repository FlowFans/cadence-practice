require("dotenv").config()
var fs = require("fs")
var path = require("path")
var fcl = require("@onflow/fcl")
var t = require("@onflow/types")
var authorization = require("./authorization.js")


// Cadence file
let contract = fs
  .readFileSync(
    path.join(
      __dirname,
      `./cadence/contracts/HelloWorld.cdc`
    ),
    "utf8"
  )

// CONTRACT_NAME must match the name of the contract in the cadence code...
var CONTRACT_NAME = `HelloWorld`
var CONTRACT_CODE = contract.trim()





console.log({
  FLOW_ACCOUNT_ADDRESS: process.env.FLOW_ACCOUNT_ADDRESS,
  FLOW_ACCOUNT_KEY_ID: process.env.FLOW_ACCOUNT_KEY_ID,
  FLOW_ACCOUNT_PRIVATE_KEY: process.env.FLOW_ACCOUNT_PRIVATE_KEY,
  CONTRACT_NAME,
  CONTRACT_CODE,
  authorization: authorization({}),
})

fcl.config().put("accessNode.api", process.env.ACCESS_NODE);

(async function main() {

  // 发起交易
  var txId = await fcl
    .send([
      fcl.transaction`
      transaction(name: String, code: String) {
        prepare(acct: AuthAccount) {
          acct.contracts.add(name: name, code: code.decodeHex())

          /* Use the below line instead of the above line if you are wanting to
          ** update an existing contract
          */
          
          // acct.contracts.update__experimental(name: name, code: code.decodeHex())
        }
      }
    `,
      fcl.proposer(authorization),
      fcl.payer(authorization),
      fcl.authorizations([authorization]),
      fcl.limit(1000),
      fcl.args([
        fcl.arg(CONTRACT_NAME, t.String),
        fcl.arg(Buffer.from(CONTRACT_CODE, "utf8").toString("hex"), t.String),
      ]),
    ])
    .then(fcl.decode)

  console.log("txId", txId)
  
  // 交易状态 
  var unsub = fcl
    .tx(txId)
    .subscribe(txStatus => console.log("txStatus", txStatus))
  await fcl.tx(txId).onceSealed()
  unsub()
})()
