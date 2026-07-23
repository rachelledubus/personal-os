// OWNER: REALTOR-OS (application)
// File: packages/realtor-os/config/entities.js
// Purpose: Register Realtor domain entity types with the Universal-OS entity registry.

import { registerEntityType } from '../../universal-core/entity-engine/registry.js';

// Register core Realtor entities. The `table` values are optional hints
// for apps that want to persist entities to specific database tables.
registerEntityType({
  name: 'Lead',
  table: 'leads',
  primaryKey: 'id',
  fields: ['first_name','last_name','email','phone','source','status','assigned_to','created_at']
});

registerEntityType({
  name: 'Contact',
  table: 'contacts',
  primaryKey: 'id',
  fields: ['first_name','last_name','email','phone','relationship','notes']
});

registerEntityType({
  name: 'Client',
  table: 'clients',
  primaryKey: 'id',
  fields: ['first_name','last_name','email','phone','client_type','representative']
});

registerEntityType({
  name: 'Property',
  table: 'properties',
  primaryKey: 'id',
  fields: ['address','city','state','zip','beds','baths','sqft','price','status','mls_id']
});

registerEntityType({
  name: 'Transaction',
  table: 'transactions',
  primaryKey: 'id',
  fields: ['property_id','buyer_id','seller_id','status','list_price','sale_price','opened_at','closed_at']
});

registerEntityType({
  name: 'Campaign',
  table: 'campaigns',
  primaryKey: 'id',
  fields: ['title','channel','audience','status','sent_at']
});

export default true;
