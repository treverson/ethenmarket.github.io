import React, { Component, Fragment } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import { Tab, Tabs, TabList, TabPanel } from "react-tabs";
import { connect } from "react-redux";
import { bindActionCreators } from "redux";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { Header, Table, Toggle, Note, Loading } from "../share";
import MoveFunds, { MOVE_FUNDS_TYPES } from "./MoveFunds";

import {
  getBalances,
  toggleMoveFundsMode as toggleMoveFundsModeAction
} from "../../reducers/balances";

import { getCurrentToken } from "../../reducers/tokens";

import { cropAddress } from "../../utils";

import {
  deposit as depositAction,
  transfer as transferAction,
  withdraw as withdrawAction,
  isLoading as getIsLoading,
  isError,
  getBalances as getBalancesAction
} from "../../reducers/actions";

const withHover = (Wrapped) => class WithHover extends Component {
  static displayName = `withHover(${Wrapped.displayName})`
  state = { hover: false }
  hoverOn = () => {
    this.setState({ hover: true });
  }
  hoverOff = () => {
    this.setState({ hover: false });
  }
  render() {
    return (
      <div
        style={{ height: '100%' }}
        onMouseEnter={this.hoverOn}
        onMouseLeave={this.hoverOff}
      >
        <Wrapped hover={this.state.hover} {...this.props} />
      </div>
    );
  }
};

const LoadingTable = Loading(Table);

const NameCellChild = styled.span`
  display: inline-block;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  text-align: left;
`;

const NameCellStyled = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  &:hover {
    ${props =>
    props.address
      ? `
          background-color: rgb(19,180,206);
          position: relative;
          padding-left: 20px;
          left: -20px;
          width: 430px;
          cursor: pointer;
          `
      : ""};
  }
  &:hover ${NameCellChild} {
    ${props =>
    props.address
      ? `
      position: absolute;
      overflow: visible;
      `
      : ""};
  }
`;


const NameCell = ({ hover, address, name }) => (
  <NameCellStyled address={address} >
    <NameCellChild>{hover ? (address || name) : name}</NameCellChild>
  </NameCellStyled>
);

const NameCellWrap = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
`;

export const balancesCompare = (a, b, invert) => {
  if (a === 'ETH') return -1;
  if (b === 'ETH') return 1;
  if (invert) {
    if (a === b) return 0;
    return a > b ? -1 : 1;
  }
  if (a === b) return 0;
  return a > b ? 1 : -1;
};

const NameCellWithHover = withHover(NameCell);

const getColumns = ({ onAddressClick }) => [
  {
    Header: "Token",
    accessor: "name",
    width: "15%",
    comparator: balancesCompare,
    renderCell: datum => (
      <CopyToClipboard
        text={datum.address || datum.name}
        onCopy={() => {
          onAddressClick(datum.address);
        }}
      >
        <NameCellWrap>
          <NameCellWithHover name={datum.name} address={datum.address} />
        </NameCellWrap>
      </CopyToClipboard>
    )
  },
  {
    Header: "Wallet",
    accessor: "wallet"
  },
  {
    Header: "ETHEN",
    accessor: "ethen"
  },
  {
    Header: "Total",
    accessor: "total"
  }
];

/* eslint-disable react/no-multi-comp */

class Balances extends Component {
  constructor(props) {
    super(props);
    this.columns = getColumns({
      onAddressClick: this.toggleNote
    });
  }
  state = {
    showNote: false
  };

  getActionHandler = action => info => {
    action({
      ...info,
      isEtherActive: this.props.isEtherActive
    });
  };

  toggleNote = () => {
    this.setState(state => {
      setTimeout(() => this.setState({ showNote: false }), 2500);
      return {
        showNote: true
      };
    });
  };

  render() {
    const {
      balances,
      toggleMoveFundsMode,
      isEtherActive,
      withdraw,
      deposit,
      transfer,
      isLoading,
      approvingState,
      token,
      error,
      requestData
    } = this.props;
    const symbol = token.symbol || cropAddress(token.address, 4);

    const currentTokenBalance = balances.find(t => t.address === token.address) || {
      ethen: '0',
      wallet: '0'
    };
    const etherBalance = balances.find(t => t.real);
    const maxBalance = isEtherActive ? etherBalance : currentTokenBalance;
    return (
      <Fragment>
        <Header>Balance</Header>
        <Note show={this.state.showNote}>Copied to clipboard</Note>
        <Tabs className="balances-tabs">
          <TabList>
            <Toggle
              leftText={symbol}
              rightText="ETH"
              position={isEtherActive ? "right" : "left"}
              onChange={toggleMoveFundsMode}
              style={{ marginRight: "30px" }}
            />
            <Tab>Deposit</Tab>
            <Tab>Withdraw</Tab>
            <Tab>Transfer</Tab>
          </TabList>
          <TabPanel>
            <MoveFunds
              maxAmount={maxBalance.wallet}
              isError={isError(approvingState)}
              isLoading={getIsLoading(approvingState)}
              action={this.getActionHandler(deposit)}
              type={MOVE_FUNDS_TYPES.DEPOSIT}
              symbol={isEtherActive ? "ETH" : symbol}
            />
          </TabPanel>
          <TabPanel>
            <MoveFunds
              maxAmount={maxBalance.ethen}
              action={this.getActionHandler(withdraw)}
              type={MOVE_FUNDS_TYPES.WITHDRAW}
              symbol={isEtherActive ? "ETH" : symbol}
            />
          </TabPanel>
          <TabPanel>
            <MoveFunds
              maxAmount={maxBalance.wallet}
              action={this.getActionHandler(transfer)}
              type={MOVE_FUNDS_TYPES.TRANSFER}
              symbol={isEtherActive ? "ETH" : symbol}
            />
          </TabPanel>
        </Tabs>
        <LoadingTable
          odd
          isLoading={isLoading}
          requestData={requestData}
          error={error}
          height="calc(100% - 148px)"
          data={balances}
          columns={this.columns}
        />
      </Fragment>
    );
  }
}

Balances.propTypes = {
  balances: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string,
      wallet: PropTypes.string,
      ethen: PropTypes.string,
      bid: PropTypes.string,
      est: PropTypes.string
    })
  ).isRequired,
  isEtherActive: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
  error: PropTypes.bool.isRequired,
  toggleMoveFundsMode: PropTypes.func.isRequired,
  deposit: PropTypes.func.isRequired,
  withdraw: PropTypes.func.isRequired,
  transfer: PropTypes.func.isRequired,
  requestData: PropTypes.func.isRequired,
  token: PropTypes.object.isRequired,
  approvingState: PropTypes.string.isRequired
};

const mapStateToProps = state => ({
  balances: getBalances(state),
  isEtherActive: state.balances.isEtherActive,
  isLoading: getIsLoading(state.balances.state),
  error: isError(state.balances.state),
  token: getCurrentToken(state),
  approvingState: state.balances.depositApprovingState
});

const mapDispatchToProps = dispatch =>
  bindActionCreators(
    {
      toggleMoveFundsMode: toggleMoveFundsModeAction,
      deposit: depositAction,
      withdraw: withdrawAction,
      transfer: transferAction,
      requestData: getBalancesAction
    },
    dispatch
  );

export default connect(mapStateToProps, mapDispatchToProps)(Balances);
