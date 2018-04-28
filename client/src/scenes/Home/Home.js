// Import React Modules
import React, { Component } from 'react';
// import ReactDOM from 'react-dom';
// import { BrowserRouter, Route, Switch } from 'react-router-dom';

// Import Scenes
// import EntryList from '../../components/EntryList/EntryList';
import CenteredTab from '../../components/CenteredTab/CenteredTab';


// Import Components

// Import Styles
import './Home.scss';

// Import Services
import {
  getWeb3Service,
  getWeb3Object,
  getAmsterdamContractInstance,
  getCurrentAccount
} from '../../services/providerService'

class Home extends Component {
  constructor(props) {
    super(props);

    this.state = {
      entryResults: [],
    };
  };

  componentWillMount() {
    getWeb3Service().then(() => {
      console.log("Got web3");
      this.setState({
       web3: getWeb3Object(),
       amsterdamContractInstance: getAmsterdamContractInstance(),
      });

      var instance = getAmsterdamContractInstance();

      getCurrentAccount().then( (accountResult) => {
       this.setState({
         account: accountResult,
       })
      })

      this.state.amsterdamContractInstance.getTotalentries.call().then((result) => {
         console.log("Total Number of Entries: ", result.toNumber() );
         this.setState({
             totalEntries: result.toNumber(),
         }); 
         // Load and show all Entries 
         this.loadAllEntries();
         this.listenToAppendEntryEvent();
         this.newEntry();
      }).catch((error) => {
        console.log(error);
      });
    })
  }

  // We want to load all Entries. Currently no backend function that returns all entry ids for all Entries on blockchain
  // ASSUMPTION for this function: there will always be a entry for every ID in 1...n; n = total number of Entries
  loadAllEntries(){
      var entryObjects = [];
      var idsProcessed = 0;

      var entryIdList = []
      for (var i = 1; i <= this.state.totalEntries; i++){
          entryIdList.push(i);
      }

      // Loop through each ID, get that entry from backend, save info in readable format on front-end, add each entry info to entryObjects array
      entryIdList.forEach( (entryId, index) => {
          this.state.amsterdamContractInstance.entries(entryId).then((entry) => {
              console.log("Entry: ", entry)
              idsProcessed++;
              var entryData = {
                "id" : entry[0].toNumber(),
                "unlockTime" : entry[1].toNumber(),
                "owner" : entry[2],
                "ipfs" : entry[3],
                "title" : entry[4],
                "descrip" : entry[5],
                "type": "SAMPLE",
              };
              entryObjects.push(entryData);
              // If we have looped through all Entries, set state
              // Need to refactor this to account for async call within for loop. For loop finishes before async call does, so this is a workaround.
              if (idsProcessed === this.state.totalEntries){
                //console.log('Results',entryObjects)
                this.setState({
                    entryResults: entryObjects
                });     
              };
          });
      });
  }


  newEntry(){
    // Declaring this for later so we can chain functions.
    // Form submitted, now waiting on metamask
    this.setState({
        formSubmitted: true
    });

    // Get accounts.
    this.state.amsterdamContractInstance.appendEntry(
      5555,
      "unlockTime", // unlock time
      "ipfs", // title
      "description", // description
      1, //uint _entryType
      [1,2], //uint[] _file
      1, // uint _rand,
      {
          from: this.state.account, 
      }
    ).then((results) => {
        // Metamask has initiated transaction
        // Now wait for transaction to be added to blockchain
        console.log("Results: ", results);
        this.setState({
            waitingMetamask: false,
            waitingConfirmation: true,
            transactionHash: results['tx']
        });
    }).catch((err) => {
        console.log(err);
    })
  }

  // Listen for events raised from the contract
  listenToAppendEntryEvent() {
      this.state.amsterdamContractInstance.EventEncMsg({}, {fromBlock: 0,toBlock: 'latest'}).watch((error, event) => {
          // This is called after metamask initiates transaction
          // We take the transaction ID that metamask initiated compare it to that of the new log event to ensure it matches our transaction
        if (event['transactionHash'] === this.state.transactionHash){
          console.log("Event: ", event);
          this.setState({
              waitingConfirmation: false
          });
          this.loadAllEntries()
        }
      })
  }


  render() {
    return (
      <div className="Home">
        <CenteredTab entryResults={this.state.entryResults}/>
      </div>
    );
  }
}

export default Home;
