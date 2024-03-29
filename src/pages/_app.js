import "@/styles/bootstrap.css";
import "@/styles/custom.css";
import "@/styles/globals.css";
import axios from "axios";
import { ThirdwebStorage } from "@thirdweb-dev/storage";
import { v4 as uuidv4 } from "uuid";
import User from "../models/User";
import dbConnect from "@/lib/dbConnect";
// import { toNano } from "locklift";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

import indexAbi from "../../abi/Index.abi.json";
import nftAbi from "../../abi/Nft.abi.json";
import collectionAbi from "../../abi/Sample.abi.json";
import collectionFactory from "../../abi/CollectionFactory.abi.json";

import {
  Address,
  ProviderRpcClient,
  Subscriber,
} from "everscale-inpage-provider";
import { useEffect, useState } from "react";
import { initVenomConnect } from "../components/test_config";
import mongoose from "mongoose";
// import { toNano } from "locklift";

export default function App({ Component, pageProps }) {
  const BaseURL = "https://venomart.space/api";
  // const BaseURL = "http://localhost:3000/api";

  const blockURL = "https://devnet.venomscan.com/";

  const AcceptingLaunch = false;

  const storage = new ThirdwebStorage();

  const [venomConnect, setVenomConnect] = useState();
  const [venomProvider, setVenomProvider] = useState();
  const [signer_address, setSignerAddress] = useState();
  const [show_loading, set_show_loading] = useState(false);

  const [standaloneProvider, setStandAloneProvider] = useState();

  const [nfts, set_nfts] = useState([]);
  const [search_data] = useState(nfts);

  const collection_address_devnet =
    "0:e22f673dc7c0e978fb4525cab9b8a2f88c17e779bb8d9bba3c43480dafb92677";

  const collection_factory_address =
    "0:88b78baad2ac1e959ce5ad7e83f7a39bc0ecb4c2cbc119a84fc381d990d508fb";

  const init = async () => {
    const _venomConnect = await initVenomConnect();
    setVenomConnect(_venomConnect);
  };

  const search_nft = async (query) => {
    // console.log(nfts);
    try {
      let filtered_nfts = [];
      nfts.filter(async (item) => {
        let parsed_item = JSON.parse(item.json);
        if (parsed_item.name.toLowerCase().includes(query)) {
          let obj = { ...item, ...parsed_item };
          filtered_nfts.push(obj);
          return obj;
        }
      });
      console.log(filtered_nfts);
      return filtered_nfts;
    } catch (error) {
      console.log(error.message);
    }
  };

  const create_user = async (data) => {
    const res = await axios({
      url: `${BaseURL}/users`,
      method: "POST",
      data: {
        wallet_id: data.wallet_id,
        user_name: "",
        bio: "",
        email: "",
        walletAddress: "",
        profileImage: "",
        coverImage: "",
        isArtist: false,
      },
    });
    return res.data;
  };

  const fetch_launchpads = async () => {
    try {
      const res = await axios({
        url: `${BaseURL}/launchpad`,
        method: "GET",
      });
      return res.data;
    } catch (error) {

      console.log(error.message);
    }
  };

  const fetch_nfts = async (data) => {
    try {
      const res = await axios({
        url: `${BaseURL}/nfts`,
        method: "GET",
      });
      console.log(res.data.data);
      if (!res.data.data) return;
      set_nfts(res.data.data);
      return res.data;
    } catch (error) {

      console.log(error.message);
    }
  };

  const get_nft_by_tokenId = async (tokenId) => {
    try {
      const res = await axios({
        url: `${BaseURL}/get_nft_tokenId`,
        method: "POST",
        data: {
          tokenId,
        },
      });

      const obj = {
        ...res.data.data[0],
        ...JSON.parse(res.data.data[0].json),
      };

      return obj;
    } catch (error) {

      console.log(error.message);
    }
  };

  const get_nfts_by_collection = async (collection_name) => {
    try {
      const nfts = await axios({
        url: `${BaseURL}/get_nft_by_collection`,
        method: "POST",
        data: {
          collection_name,
        },
      });

      return nfts.data;
    } catch (error) {

      console.log(error.message);
    }
  };

  const update_profile = async (data) => {
    console.log(data.isArtist);
    const profile_img = data?.profileImage
      ? await storage.upload(data.profileImage)
      : data.profileImage;
    const cover_img = data?.coverImage
      ? await storage.upload(data.coverImage)
      : data.coverImage;
    const res = await axios({
      url: `${BaseURL}/users`,
      method: "PUT",
      data: {
        wallet_id: data.walletAddress,
        user_name: data.user_name,
        email: data.email,
        bio: data.bio,
        profileImage: profile_img,
        coverImage: cover_img,
        isArtist: data.isArtist,
        socials: [data.twitter, data.instagram, data.customLink],
      },
    });
    console.log(res.data);
  };

  const getAddress = async (provider) => {
    const providerState = await provider?.getProviderState?.();
    return providerState?.permissions.accountInteraction?.address.toString();
  };

  const checkAuth = async (_venomConnect) => {
    const auth = await _venomConnect?.checkAuth();
    if (auth) await getAddress(_venomConnect);
  };

  const initStandalone = async () => {
    const standalone = await venomConnect?.getStandalone();
    setStandAloneProvider(standalone);
    return standalone;
  };

  const onConnect = async (provider) => {
    await onProviderReady(provider);
    setVenomProvider(provider);
  };

  const onDisconnect = async () => {
    venomProvider?.disconnect();
    setSignerAddress(undefined);
  };

  const onProviderReady = async (provider) => {
    const venomWalletAddress = provider
      ? await getAddress(provider)
      : undefined;
    setSignerAddress(venomWalletAddress);
    create_user({ wallet_id: venomWalletAddress });
    return venomWalletAddress;
  };

  const connect_wallet = async () => {
    if (!venomConnect) return;
    await venomConnect.connect();
  };

  //COLLECTION FUNCTIONS

  const mint_nft = async (provider) => {
    // const standalone = await venomConnect?.getStandalone("venomwallet");
    const json = {
      type: "Basic NFT",
      name: "Sample Name",
      description: "Hello world!",
      preview: {
        source:
          "https://venom.network/static/media/bg-main.6b6f0965e7c3b3d9833b.jpg",
        mimetype: "image/png",
      },
      files: [
        {
          source:
            "https://venom.network/static/media/bg-main.6b6f0965e7c3b3d9833b.jpg",
          mimetype: "image/jpg",
        },
      ],
      external_url: "https://venom.network",
    };
    // if (standalone) {
    const contract = new venomProvider.Contract(
      collectionAbi,
      collection_address_devnet
    );
    const { count: id } = await contract.methods
      .totalSupply({ answerId: 0 })
      .call();

    const subscriber = new Subscriber(venomProvider);
    contract
      .events(subscriber)
      .filter((event) => event.event === "tokenCreated")
      .on(async (event) => {
        console.log({ event });
      });

    const outputs = await contract.methods
      .mintNft({ json: JSON.stringify(json) })
      .send({
        from: new Address(signer_address),
        amount: "1000000000",
      });

    const { nft: nftAddress } = await contract.methods
      .nftAddress({ answerId: 0, id: id })
      .call();
  };

  useEffect(() => {
    init();
    //fetch all collection
    fetch_all_collections();
  }, []);

  // connect event handler
  useEffect(() => {
    const off = venomConnect?.on("connect", onConnect);
    if (venomConnect) {
      checkAuth(venomConnect);
    }

    return () => {
      off?.();
    };
  }, [venomConnect]);

  // functions for nft fetching
  const getNftImage = async (provider, nftAddress) => {
    const nftContract = new provider.Contract(nftAbi, nftAddress);
    // calling getJson function of NFT contract
    const getJsonAnswer = await nftContract.methods
      .getJson({ answerId: 0 })
      .call();
    const json = JSON.parse(getJsonAnswer.json ?? "{}");
    return json;
  };

  // Returns array with NFT's images urls
  const getCollectionItems = async (provider, nftAddresses) => {
    return Promise.all(
      nftAddresses.map(async (nftAddress) => {
        const imgInfo = await getNftImage(provider, nftAddress);
        return JSON.parse(imgInfo);
      })
    );
  };

  const getNftCodeHash = async (provider) => {
    const collectionAddress = new Address(collection_address_devnet);
    const contract = new provider.Contract(collectionAbi, collectionAddress);
    const { codeHash } = await contract.methods
      .nftCodeHash({ answerId: 0 })
      .call({ responsible: true });
    return BigInt(codeHash).toString(16);
  };

  // Method, that return NFT's addresses by single query with fetched code hash
  const getNftAddresses = async (codeHash) => {
    const addresses = await venomProvider?.getAccountsByCodeHash({
      codeHash,
    });
    return addresses?.accounts;
  };

  const getNftsByIndexes = async (provider, indexAddresses) => {
    const nftAddresses = await Promise.all(
      indexAddresses.map(async (indexAddress) => {
        const indexContract = new provider.Contract(indexAbi, indexAddress);
        const indexInfo = await indexContract.methods
          .getInfo({ answerId: 0 })
          .call();
        return indexInfo.nft;
      })
    );
    return getCollectionItems(provider, nftAddresses);
  };

  const saltCode = async (provider, ownerAddress) => {
    // Index StateInit you should take from github. It ALWAYS constant!
    const INDEX_BASE_64 =
      "te6ccgECIAEAA4IAAgE0AwEBAcACAEPQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAgaK2zUfBAQkiu1TIOMDIMD/4wIgwP7jAvILHAYFHgOK7UTQ10nDAfhmifhpIds80wABn4ECANcYIPkBWPhC+RDyqN7TPwH4QyG58rQg+COBA+iogggbd0CgufK0+GPTHwHbPPI8EQ4HA3rtRNDXScMB+GYi0NMD+kAw+GmpOAD4RH9vcYIImJaAb3Jtb3Nwb3T4ZNwhxwDjAiHXDR/yvCHjAwHbPPI8GxsHAzogggujrde64wIgghAWX5bBuuMCIIIQR1ZU3LrjAhYSCARCMPhCbuMA+EbycyGT1NHQ3vpA0fhBiMjPjits1szOyds8Dh8LCQJqiCFus/LoZiBu8n/Q1PpA+kAwbBL4SfhKxwXy4GT4ACH4a/hs+kJvE9cL/5Mg+GvfMNs88gAKFwA8U2FsdCBkb2Vzbid0IGNvbnRhaW4gYW55IHZhbHVlAhjQIIs4rbNYxwWKiuIMDQEK103Q2zwNAELXTNCLL0pA1yb0BDHTCTGLL0oY1yYg10rCAZLXTZIwbeICFu1E0NdJwgGOgOMNDxoCSnDtRND0BXEhgED0Do6A34kg+Gz4a/hqgED0DvK91wv/+GJw+GMQEQECiREAQ4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAD/jD4RvLgTPhCbuMA0x/4RFhvdfhk0ds8I44mJdDTAfpAMDHIz4cgznHPC2FeIMjPkll+WwbOWcjOAcjOzc3NyXCOOvhEIG8TIW8S+ElVAm8RyM+EgMoAz4RAzgH6AvQAcc8LaV4gyPhEbxXPCx/OWcjOAcjOzc3NyfhEbxTi+wAaFRMBCOMA8gAUACjtRNDT/9M/MfhDWMjL/8s/zsntVAAi+ERwb3KAQG90+GT4S/hM+EoDNjD4RvLgTPhCbuMAIZPU0dDe+kDR2zww2zzyABoYFwA6+Ez4S/hK+EP4QsjL/8s/z4POWcjOAcjOzc3J7VQBMoj4SfhKxwXy6GXIz4UIzoBvz0DJgQCg+wAZACZNZXRob2QgZm9yIE5GVCBvbmx5AELtRNDT/9M/0wAx+kDU0dD6QNTR0PpA0fhs+Gv4avhj+GIACvhG8uBMAgr0pCD0oR4dABRzb2wgMC41OC4yAAAADCD4Ye0e2Q==";
    // Gettind a code from Index StateInit
    const tvc = await provider.splitTvc(INDEX_BASE_64);
    if (!tvc.code) throw new Error("tvc code is empty");
    const ZERO_ADDRESS =
      "0:0000000000000000000000000000000000000000000000000000000000000000";

    // Salt structure that we already know
    const saltStruct = [
      { name: "zero_address", type: "address" },
      { name: "owner", type: "address" },
      { name: "type", type: "fixedbytes3" }, // according on standards, each index salted with string 'nft'
    ];
    const { code: saltedCode } = await provider.setCodeSalt({
      code: tvc.code,
      salt: {
        structure: saltStruct,
        abiVersion: "2.1",
        data: {
          zero_address: new Address(ZERO_ADDRESS),
          owner: new Address(ownerAddress),
          type: btoa("nft"),
        },
      },
    });
    return saltedCode;
  };

  const getAddressesFromIndex = async (codeHash) => {
    const addresses = await venomProvider?.getAccountsByCodeHash({
      codeHash,
    });
    return addresses?.accounts;
  };

  // Main method of this component.
  const loadNFTs = async () => {
    const provider = venomProvider;
    try {
      const nftCodeHash = await getNftCodeHash(provider);
      if (!nftCodeHash) {
        return;
      }
      const nftAddresses = await getNftAddresses(nftCodeHash);
      if (!nftAddresses || !nftAddresses.length) {
        // if (nftAddresses && !nftAddresses.length) setListIsEmpty(true);
        return;
      }
      const nftURLs = await getCollectionItems(provider, nftAddresses);
    } catch (e) {
      console.error(e);
    }
  };

  const fetch_artists = async () => {
    try {
      const artists = await axios({
        url: `${BaseURL}/fetch_artists`,
        method: "GET",
      });
      console.log(artists.data);
      return artists.data;
    } catch (error) {

      console.log(error.message);
    }
  };

  const fetch_collection_by_name = async (collection_id) => {
    try {
      const res = await axios({
        url: `${BaseURL}/get_collection_by_name`,
        method: "POST",
        data: {
          collection_id,
        },
      });
      console.log(res.data);
      return res.data;
    } catch (error) {

      console.log(error.message);
    }
  };

  const get_nfts_by_owner = async (wallet_id) => {
    try {
      const res = await axios({
        url: `${BaseURL}/get_nft_owner`,
        method: "POST",
        data: {
          wallet_id,
        },
      });

      return res.data;
    } catch (error) {

      console.log(error.message);
    }
  };

  const get_launchpad_by_address = async (address) => {
    try {
      const res = await axios({
        url: `${BaseURL}/get_launchpad_by_address`,
        method: "POST",
        data: {
          address,
        },
      });

      console.log(res.data);
      return res.data;
    } catch (error) {

      console.log(error.message);
    }
  };

  const create_launchpad = async (data) => {
    const ipfs_logo = await storage.upload(data.logo);
    const ipfs_coverImage = await storage.upload(data.coverImage);
    try {
      const res = await axios({
        url: `${BaseURL}/launchpad`,
        method: "POST",
        data: {
          logo: ipfs_logo,
          coverImage: ipfs_coverImage,
          name: data.name,
          description: data.description,
          address: data.address,
          max_supply: data.max_supply,
          mint_price: data.mint_price,
          json: data.json,
          start_date: data.start_date,
          email: data.email,
          isActive: data.isActive,
        },
      });

      const collection_data = {
        image: data.coverImage,
        logo: data.logo,
        collection_address: data.address,
        name: data.name,
        description: data.description,
      };

      await create_new_collection(collection_data);
    } catch (error) {

      console.log(error.message);
    }
  };

  const create_nft = async (data) => {
    set_show_loading(true);
    console.log({ data });
    try {
      const ipfs_image =
        typeof data.image == "string"
          ? data.image
          : await storage.upload(data.image);

      const nft_json = JSON.stringify({
        type: "Basic NFT",
        id: 0,
        name: data.name,
        description: data.description,
        preview: {
          source: ipfs_image.replace(
            "ipfs://",
            "https://gateway.ipfscdn.io/ipfs/"
          ),
          mimetype: "image/png",
        },
        files: [
          {
            source: ipfs_image.replace(
              "ipfs://",
              "https://gateway.ipfscdn.io/ipfs/"
            ),
            mimetype: ipfs_image.replace(
              "ipfs://",
              "https://gateway.ipfscdn.io/ipfs/"
            ),
          },
        ],
        attributes: data.properties.filter((e) => e.type.length > 0),
        external_url: "https://venomart.space",
        nft_image: ipfs_image,
        collection_name: data.collection,
      });

      const contract = new venomProvider.Contract(
        collectionAbi,
        data.collection_address
          ? data.collection_address
          : collection_address_devnet
      );

      const { count: id } = await contract.methods
        .totalSupply({ answerId: 0 })
        .call();

      const subscriber = new Subscriber(venomProvider);
      contract
        .events(subscriber)
        .filter((event) => event.event === "tokenCreated")
        .on(async (event) => {
          const { nft: nftAddress } = await contract.methods
            .nftAddress({ answerId: 0, id: id })
            .call();
          const res = await axios({
            url: `${BaseURL}/nfts`,
            method: "POST",
            data: {
              nft_address: nftAddress._address,
              tokenId: data.tokenId_launchpad
                ? data.tokenId_launchpad
                : event.data.tokenId,
              collection_name: data.collection,
              json: nft_json,
              owner: signer_address,
            },
          });

          set_show_loading(false);
          window.location.replace("/nft/exploreNFTs");
        });
      const outputs = await contract.methods.mintNft({ json: nft_json }).send({
        from: new Address(signer_address),
        amount: "1000000000",
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  //COLLECTION
  const create_new_collection = async (data) => {
    const contract = new venomProvider.Contract(
      collectionFactory,
      collection_factory_address
    );

    const txn = await contract.methods
      .create_collection({
        _state: "1",
        _json: JSON.stringify({ demo: "demo_name" }),
      })
      .send({
        from: new Address(signer_address),
        amount: "100000000",
      });

    const cover_ips = await storage.upload(data.image);
    const logo_ipfs = await storage.upload(data.logo);

    const res = await axios({
      url: `${BaseURL}/collections`,
      method: "POST",
      data: {
        collection_address: data.collection_address,
        user_wallet: signer_address,
        cover_image: cover_ips,
        logo: logo_ipfs,
        name: data.name,
        symbol: data.symbol || "",
        description: data.description,
      },
    });
  };

  const get_collection_info_by_id = async (collection_id) => {
    try {
      const res = await axios({
        url: `${BaseURL}/get_collection_info_by_id`,
        method: "POST",
        data: {
          collection_id,
        },
      });
      return res.data;
    } catch (error) {

      console.log(error.message);
    }
  };

  const get_collections_by_owner = async (signer_address) => {
    try {
      const res = await axios({
        url: `${BaseURL}/get_collection_owner`,
        method: "POST",
        data: {
          wallet_address: signer_address,
        },
      });
      return res.data;
    } catch (error) {

      console.log(error.message);
    }
  };

  const fetch_all_collections = async () => {
    try {
      const res = await axios({
        url: `${BaseURL}/get_all_collections`,
        method: "GET",
      });
      return res.data.data;
    } catch (error) {

      console.log(error.message);
    }
  };

  // SELL NFTS
  const NFT_ADDRESS = new Address(
    "0:f5a48f12fc9d3208d5b885b8d839834faff4c36fd653e5812e48cfb6ed187d60"
  );
  const AUCTION_ADDRESS = new Address(
    "0:6bdbcd439ba96f803cba9477ab27ffdea2c82db5467d9af35ba05ad9f4585b86"
  );

  const sell_nft = async (nft_address, tokenId, price) => {
    try {
      const nft_contract = new venomProvider.Contract(nftAbi, nft_address);
      const txn = await nft_contract.methods
        .transfer({
          to: AUCTION_ADDRESS,
          sendGasTo: signer_address,
          callbacks: [[AUCTION_ADDRESS, { value: "100000000", payload: "" }]],
        })
        .send({
          from: signer_address,
          amount: "2000000000",
        });
      console.log({ txn });
      const res = await axios({
        url: `${BaseURL}/list_nft`,
        method: "POST",
        data: {
          signer_address: signer_address,
          tokenId,
          listingPrice: (Number(price) * 1000000000).toString(),
        },
      });
    } catch (error) {

      console.log(error.message);
    }
  };

  const buy_nft = async (tokenId, price) => {
    console.log({ tokenId, price });
    try {
      const contract = new venomProvider.Contract(
        collectionFactory,
        collection_factory_address
      );

      const txn = await contract.methods
        .create_collection({
          _state: "1",
          _json: JSON.stringify({ demo: "demo_name" }),
        })
        .send({
          from: new Address(signer_address),
          amount: price,
        });

      const res = await axios({
        url: `${BaseURL}/buy_nft`,
        method: "POST",
        data: {
          tokenId,
          buyer_address: signer_address,
        },
      });
      console.log(res.data);
    } catch (error) {

      console.log(error.message);
    }
  };

  return (
    <>
      <Navbar
        theme={"dark"}
        signer_address={signer_address}
        connect_wallet={connect_wallet}
        onDisconnect={onDisconnect}
        search_nft={search_nft}
        collection_address_devnet={collection_address_devnet}
      />
      {/* <button className="mt-52" onClick={sell_nft}>
        Press{" "}
      </button> */}
      <Component
        {...pageProps}
        show_loading={show_loading}
        get_launchpad_by_address={get_launchpad_by_address}
        fetch_launchpads={fetch_launchpads}
        create_launchpad={create_launchpad}
        buy_nft={buy_nft}
        sell_nft={sell_nft}
        fetch_collection_by_name={fetch_collection_by_name}
        get_nfts_by_collection={get_nfts_by_collection}
        get_nft_by_tokenId={get_nft_by_tokenId}
        get_nfts_by_owner={get_nfts_by_owner}
        fetch_all_collections={fetch_all_collections}
        get_collections_by_owner={get_collections_by_owner}
        get_collection_info_by_id={get_collection_info_by_id}
        create_new_collection={create_new_collection}
        fetch_nfts={fetch_nfts}
        loadNFTs={loadNFTs}
        create_user={create_user}
        update_profile={update_profile}
        create_nft={create_nft}
        mint_nft={mint_nft}
        standaloneProvider={venomProvider}
        theme={"dark"}
        signer_address={signer_address}
        blockURL={blockURL}
        collection_address_devnet={collection_address_devnet}
        AcceptingLaunch={AcceptingLaunch}
      />
      <Footer theme={"dark"} />
    </>
  );
}
