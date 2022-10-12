from binance_summary import get_latest_assets_jpy
from moneyforward_selenium import update_mf_account

latest_asset_eth_jpy = get_latest_assets_jpy('ETH')
if not latest_asset_eth_jpy:
    print('no latest asset')
    exit()
update_mf_account("Binance", latest_asset_eth_jpy)
