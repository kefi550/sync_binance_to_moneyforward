import os
from binance_summary import get_latest_assets_jpy
from moneyforward_selenium import MoneyForwardScraper

MONEYFORWARD_USER = os.environ["MONEYFORWARD_USER"]
MONEYFORWARD_PASSWORD = os.environ["MONEYFORWARD_PASSWORD"]

latest_asset_eth_jpy = get_latest_assets_jpy('ETH')
if not latest_asset_eth_jpy:
    print('no latest asset')
    exit()

mf = MoneyForwardScraper(MONEYFORWARD_USER, MONEYFORWARD_PASSWORD)
mf.change_mf_group('グループ選択なし')
mf.update_account_amount("Binance", latest_asset_eth_jpy)
