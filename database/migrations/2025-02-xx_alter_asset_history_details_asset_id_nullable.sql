-- Make asset_history_details.asset_id nullable and set FK to ON DELETE SET NULL

alter table asset_history_details
  alter column asset_id drop not null;

alter table asset_history_details
  drop constraint if exists asset_history_details_asset_id_fkey;

alter table asset_history_details
  add constraint asset_history_details_asset_id_fkey
    foreign key (asset_id)
    references multiple_assets(id)
    on delete set null;

