import {libNode} from '@eversdk/lib-node'
import {
    BuilderOp,
    builderOpBitString,
    builderOpCell,
    KeyPair, ResultOfProcessMessage,
    ResultOfQueryCollection,
    ResultOfRunGet, ResultOfSendMessage,
    TonClient
} from '@eversdk/core'
import * as process from 'process'

const ADDRESS: string = '0:d683905aa846e2a7c0ef6f1926a26e031f58bf0e63b67b472b25efc76661516c'
const keysWallet: KeyPair = {
    public: 'F0994C7A8345A54E5226CCD7397EE91A1124D2BAF43E11B4726B21481F4D4408',
    secret: '01A99DF302F09408F53326FBD0470BBC05CC9A6DA21A76B6E0F13EE9977D55D2'
}

const hexToBytes = (hex: string): Uint8Array => new Uint8Array(hex.match(/.{1,2}/g)
    .map(byte => parseInt(byte, 16)))

const bytesToBase64 = (data: Uint8Array | number[]): string => {
    const bytes = new Uint8Array(data)
    // @ts-ignore
    const str = String.fromCharCode(...bytes)
    return Buffer.from(bytes).toString('base64')
}

async function main(): Promise<void> {
    TonClient.useBinaryLibrary(libNode)
    const client: TonClient = new TonClient({
        network: {
            endpoints: ['https://devnet.evercloud.dev/891375428d7749a798093eac2b3db2bf']
            // endpoints: ['https://mainnet.evercloud.dev/891375428d7749a798093eac2b3db2bf']
        }
    })

    const queryCollectionResult: ResultOfQueryCollection = await client.net.query_collection({
        collection: 'accounts',
        filter: {
            id: {
                eq: ADDRESS
            }
        },
        result: 'boc'
    })
    const account: string = queryCollectionResult.result[0]['boc']

    const resultOfRunGet: ResultOfRunGet = await client.tvm.run_get({
        account,
        function_name: 'address_by_public_key',
        input: [`0x${keysWallet.public}`]
    })

    const walletAddress: string = `0:${(resultOfRunGet.output[0] as string).substring(2)}`
    const valid_until: number = ~~(Date.now() / 1000) + 120
    const to: string = (await client.abi.encode_boc({
        params: [ { name: 'a0', type: 'address' } ],
        data: { a0: ADDRESS }
    })).boc

    // UPDATE THIS
    const seq_no: number = 1

    // TODO покрасивее
    // valid_until int   unix timestamp until the message is valid
    // seq_no      int   curent wallet seq_no (sequence number)
    // msgs        tuple [[slice to, int value, int mode, int bounce, cell body, cell init]]
    // (cell) pack_msg_inner_sign
    const messageInner: string = (await client.tvm.run_get({
        account,
        function_name: 'pack_msg_inner_sign',
        input: [
            valid_until,
            seq_no,
            [[
                { type: "Slice", value: to }, 100_000_000, 0, false, null, null
            ]]
        ]
    })).output[0].value

    const messageInnerHash: string = (await client.boc.get_boc_hash({
        boc: messageInner
    })).hash
    const signature: string = (await client.crypto.sign({
        unsigned: bytesToBase64(hexToBytes(messageInnerHash)),
        keys: keysWallet
    })).signature

    const signBoc: string = (await client.abi.encode_boc({
        params: [ { name: 'a0', type: 'uint256' }, { name: 'a1', type: 'uint256' } ],
        data: { a0: `0x${signature.slice(0, 64)}`, a1: `0x${signature.slice(64, 128)}` }
    })).boc

    // TODO покрасивее
    // sign       slice ed25519 signature of the msg_inner cell
    // msg_inner  cell  cell built by using the pack_msg_inner_sign
    // wc         int   target wallet contract workchain
    // public_key int   wallet public_key or zero value
    // init?      int   add state init or not -1 (true) or 0 (false)
    // (cell) pack_external_msg
    const externalMessage: string = (await client.tvm.run_get({
        account,
        function_name: 'pack_external_msg',
        input: [
            { type: "Slice", value: signBoc },
            { type: "Cell", value: messageInner},
            0,
            `0x${keysWallet.public}`,
            0
        ]
    })).output[0].value


    const resultOfSendMessage: ResultOfSendMessage= await client.processing.send_message({
        message: externalMessage,
        send_events: false
    })
    const x: ResultOfProcessMessage = await client.processing.wait_for_transaction({
        message: externalMessage,
        shard_block_id: resultOfSendMessage.shard_block_id,
        send_events: false
    })
    console.log(x)
    client.close()
}

main().catch(console.log)