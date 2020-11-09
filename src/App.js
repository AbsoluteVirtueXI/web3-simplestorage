import React, { useState, useEffect, useReducer } from 'react'
import { Heading, Text, HStack, VStack, Button, Input } from '@chakra-ui/core'
// https://docs.ethers.io/v5/
import { ethers } from 'ethers'
import { isConnected2MetaMask, connect2Contract } from './utils/eth-utils'
import {
  SimpleStorage_address,
  SimpleStorage_abi,
} from './contracts/SimpleStorage'

const web3Reducer = (state, action) => {
  switch (action.type) {
    case 'SET_isWeb3':
      return { ...state, isWeb3: action.isWeb3 }
    case 'SET_isEnabled':
      return { ...state, isEnabled: action.isEnabled }
    case 'SET_account':
      return { ...state, account: action.account }
    case 'SET_provider':
      return { ...state, provider: action.provider }
    case 'SET_network':
      return { ...state, network: action.network }
    case 'SET_signer':
      return { ...state, signer: action.signer }
    case 'SET_balance':
      return { ...state, balance: action.balance }
    case 'SET_CONTRACT_simpleStorage':
      return { ...state, simpleStorage: action.simpleStorage }
    default:
      throw new Error(`Unhandled action ${action.type} in web3Reducer`)
  }
}

const web3InitialState = {
  isWeb3: false,
  isEnabled: false,
  account: ethers.constants.AddressZero,
  provider: null,
  signer: null,
  network: null,
  balance: '0',
  simpleStorage: null,
}

function App() {
  const [web3State, web3Dispatch] = useReducer(web3Reducer, web3InitialState)
  const [getValue, setGetValue] = useState(0)
  const [inputValue, setInputValue] = useState(0)

  const handleOnClickGet = async () => {
    const res = await web3State.simpleStorage.get()
    setGetValue(res.toString())
  }

  const handleOnClickSet = async () => {
    const tx = await web3State.simpleStorage.set(inputValue)
  }

  // Check if Web3 is injected
  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      web3Dispatch({ type: 'SET_isWeb3', isWeb3: true })
    } else {
      web3Dispatch({ type: 'SET_isWeb3', isWeb3: false })
    }
  }, [])

  // Check if already connected to MetaMask
  useEffect(() => {
    const isConnected = async () => {
      const account = await isConnected2MetaMask()
      if (account) {
        web3Dispatch({ type: 'SET_isEnabled', isEnabled: true })
        web3Dispatch({ type: 'SET_account', account: account })
      } else {
        web3Dispatch({ type: 'SET_isEnabled', isEnabled: false })
      }
    }
    if (web3State.isWeb3) {
      isConnected()
    }
  }, [web3State.isWeb3])

  //If not connected to metamask connect with button
  useEffect(() => {
    const connect2MetaMask = async () => {
      try {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
        })
        web3Dispatch({ type: 'SET_isEnabled', isEnabled: true })
        web3Dispatch({ type: 'SET_account', account: accounts[0] })
      } catch (e) {
        web3Dispatch({
          type: 'SET_account',
          account: ethers.constants.AddressZero,
        })
        web3Dispatch({ type: 'SET_isEnabled', isEnabled: false })
      }
    }

    if (web3State.isWeb3 && !web3State.isEnabled) {
      connect2MetaMask()
    }
  }, [web3State.isWeb3, web3State.isEnabled])

  // Connect to provider
  useEffect(() => {
    const connect2Provider = async () => {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum)
        web3Dispatch({ type: 'SET_provider', provider: provider })
        const signer = provider.getSigner()
        web3Dispatch({ type: 'SET_signer', signer: signer })
        // https://docs.ethers.io/v5/api/providers/provider/#Provider-getBalance
        const network = await provider.getNetwork()
        web3Dispatch({ type: 'SET_network', network: network })
        // https://docs.ethers.io/v5/api/providers/provider/#Provider-getBalance
        const _balance = await provider.getBalance(web3State.account)
        // https://docs.ethers.io/v5/api/utils/display-logic/#utils-formatEther
        const balance = ethers.utils.formatEther(_balance)
        web3Dispatch({ type: 'SET_balance', balance: balance })
      } catch (e) {
        web3Dispatch({ type: 'SET_network', network: web3InitialState.network })
        web3Dispatch({ type: 'SET_balance', balance: web3InitialState.balance })
      }
    }

    if (
      web3State.isEnabled &&
      web3State.account !== ethers.constants.AddressZero
    ) {
      connect2Provider()
    }
  }, [web3State.isEnabled, web3State.account])

  useEffect(() => {
    //If we are on the rinkeby network and signer is set, connect to contract SimpleStorage
    if (
      web3State.isEnabled &&
      web3State.network &&
      web3State.network.chainId === 4 &&
      web3State.signer
    ) {
      web3Dispatch({
        type: 'SET_CONTRACT_simpleStorage',
        simpleStorage: new ethers.Contract(
          SimpleStorage_address,
          SimpleStorage_abi,
          web3State.signer
        ),
      })
    }
  }, [web3State.signer, web3State.network, web3State.isEnabled])

  if (!web3State.isWeb3) {
    return <Text>INSTALL METAMASK</Text>
  }

  return (
    <>
      <HStack>
        <Button onClick={handleOnClickGet}>GET</Button>
        <Text>{getValue}</Text>
      </HStack>
      <HStack>
        <Button onClick={handleOnClickSet}>SET</Button>
        <Input
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.currentTarget.value)
          }}
        />
      </HStack>
    </>
  )
}

export default App
