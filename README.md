# Preprocessed wallet

## Install

```shell
yarn isntall
```

## Run
```shell
yarn start
```


## Hardcoded data

Contract address
```
0:d683905aa846e2a7c0ef6f1926a26e031f58bf0e63b67b472b25efc76661516c
```

Contract methods
```
;; valid_until int   unix timestamp until the message is valid
;; seq_no      int   curent wallet seq_no (sequence number)
;; msgs        tuple [[slice to, int value, int mode, int bounce, cell body, cell init]]
(cell) pack_msg_inner_sign

;; sign       slice ed25519 signature of the msg_inner cell
;; msg_inner  cell  cell built by using the pack_msg_inner_sign
;; wc         int   target wallet contract workchain
;; public_key int   wallet public_key or zero value
;; init?      int   add state init or not -1 (true) or 0 (false)
(cell) pack_external_msg

;; public_key int ...
(int) address_by_public_key
```