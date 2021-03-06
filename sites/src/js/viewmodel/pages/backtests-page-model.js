import ContainerJS         from "container-js"
import Observable          from "../../utils/observable"
import PositionsTableModel from "../positions/positions-table-model"
import TradingSummaryModel from "../trading-summary/trading-summary-model"
import BacktestModel       from "../backtests/backtest-model"
import AgentSettingBuilder from "../agents/agent-setting-builder"

export default class BacktestsPageModel extends Observable {

  constructor() {
    super();
    this.viewModelFactory = ContainerJS.Inject;
    this.backtests        = ContainerJS.Inject;
    this.backtestService  = ContainerJS.Inject;
    this.agentClasses     = ContainerJS.Inject;
    this.icons            = ContainerJS.Inject;

    this.tradingSummariesService  = ContainerJS.Inject;
  }

  postCreate() {
    this.backtestList  = this.viewModelFactory.createBacktestListModel();
    this.agentSettingBuilder = new AgentSettingBuilder(
      this.agentClasses, this.icons);
    this.chart         = this.viewModelFactory.createChart({
      displaySubGraph: true,
      usePreferencesPairSelector: false
    });
    this.positionTable =
      this.viewModelFactory.createPositionsTableModel(50, {
        order:     "profit_or_loss",
        direction: "desc"
      });
    this.selection =
        this.viewModelFactory.createPositionSelectionModel();
    this.selection.attach(this.positionTable);
    this.positionDownloader = this.viewModelFactory.createPositionDownloader();

    this.tradingSummary =
      this.viewModelFactory.createTradingSummaryViewModel();
    this.logViewer = this.viewModelFactory.createLogViewerModel();

    this.registerObservers();
  }

  registerObservers() {
    this.addObserver("propertyChanged", (n, e) => {
      if (e.key === "activeTab") this.onTabChanged();
      if (e.key === "selectedBacktest") this.onBacktestChanged();
    });
    this.backtests.addObserver("updateStates", (n, e) => {
      if ( !this.selectedBacktestId || !this.selectedBacktest) return;
      const src = this.backtests.get(this.selectedBacktestId);
      if (this.selectedBacktest.status == src.status) return;
      this.selectedBacktest.status = src.status;
      this.setProperty("selectedBacktest", this.selectedBacktest, () => false);
    }, this);
  }

  initialize( ) {
    this.selectedBacktestId = null;
    this.selectedBacktest   = null;
    this.activeTab          = null;

    this.backtests.initialize().then(
      () => this.onBacktestLoaded());
  }

  remove(backtestId) {
    return this.backtestList.remove(backtestId).then(
      () => this.selectedBacktestId = null);
  }
  restart(backtestId) {
    return this.backtestList.restart(backtestId).then(
      ()  => this.selectedBacktestId = null,
      (e) => {
        e.message = "再実行に失敗しました。バックテストの状態を確認してください";
        throw e;
      });
  }
  cancel(backtestId) {
    return this.backtestList.cancel(backtestId).then(
      (result) => result,
      (e) => {
        e.message = "キャンセルに失敗しました。バックテストの状態を確認してください";
        throw e;
      });
  }

  onBacktestLoaded() {
    const model = this.backtests.get(this.selectedBacktestId);
    this.selectedBacktest = model ? new BacktestModel(model) : null;
  }

  onTabChanged() {
    if (!this.selectedBacktest) return;
    this.initializeActiveTabData();
  }
  onBacktestChanged() {
    if (!this.selectedBacktest) return;
    this.initializeActiveTabData();
  }

  initializeActiveTabData() {
    if (this.activeTab === "trades") {
      this.positionTable.initialize( this.selectedBacktest.id );
      this.positionTable.load();
      this.positionDownloader.initialize(this.selectedBacktest);
    } else if (this.activeTab === "report") {
      this.tradingSummary.backtestId = this.selectedBacktest.id;
    } else if (this.activeTab === "chart") {
      this.chart.backtest = this.selectedBacktest;
      this.chart.pairSelector.selectedPair =
        this.selectedBacktest ? this.selectedBacktest.pairNames[0] : null;
    } else if (this.activeTab === "logs") {
      this.logViewer.initialize(this.selectedBacktest.id);
      this.logViewer.load();
    } else {
      this.backtestService.getAgentSettings(this.selectedBacktest.id).then(
        (agents) => this.agentSettingBuilder.initialize(agents));
    }
  }

  get selectedBacktestId() {
    return this.getProperty("selectedBacktestId");
  }
  set selectedBacktestId(id) {
    this.setProperty("selectedBacktestId", id);
    this.backtests.initialize().then(
      () => this.onBacktestLoaded());
  }

  get selectedBacktest() {
    return this.getProperty("selectedBacktest");
  }
  set selectedBacktest(backtest) {
    this.setProperty("selectedBacktest", backtest);
  }

  get activeTab() {
    return this.getProperty("activeTab");
  }
  set activeTab(id) {
    this.setProperty("activeTab", id);
  }


  get tradingSummary() {
    return this.getProperty("tradingSummary");
  }
  set tradingSummary(summary) {
    this.setProperty("tradingSummary", summary);
  }
}
