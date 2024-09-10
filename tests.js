import { Tinytest } from 'meteor/tinytest';
import { Mongo } from 'meteor/mongo';
import { SoftDelete, addDeleted } from 'meteor/jam:soft-delete';

const collection = new Mongo.Collection('test');

Tinytest.add('addDeleted', function (test) {
  let selector = {};

  addDeleted(selector);
  test.equal(selector.deleted, false);

  selector.deleted = true;
  addDeleted(selector);
  test.equal(selector.deleted, true);

  selector._id = 'someId';
  delete selector.deleted;
  addDeleted(selector);
  test.isUndefined(selector.deleted);
});

Tinytest.addAsync('softRemoveAsync', async function (test) {
  const doc = { _id: 'doc1', name: 'Test Doc' };

  await collection.insertAsync(doc);

  await collection.softRemoveAsync({ _id: 'doc1' });
  const removedDoc = await collection.findOneAsync({ _id: 'doc1' });

  test.equal(removedDoc.deleted, true);
  test.isTrue(removedDoc.updatedAt instanceof Date);
});

Tinytest.addAsync('recoverAsync', async function (test) {
  const doc = { _id: 'doc2', name: 'Test Doc' };

  await collection.insertAsync(doc);
  await collection.removeAsync({ _id: 'doc2' });

  await collection.recoverAsync({ _id: 'doc2' });
  const recoveredDoc = await collection.findOneAsync({ _id: 'doc2' });

  test.equal(recoveredDoc.deleted, false);
  test.isTrue(recoveredDoc.updatedAt instanceof Date);
  test.isUndefined(recoveredDoc.deletedAt);
});

Tinytest.addAsync('removeAsync with string selector', async function (test) {
  const doc = { _id: 'doc4', name: 'Test Doc' };

  await collection.insertAsync(doc);
  await collection.removeAsync('doc4');

  const removedDoc = await collection.findOneAsync({ _id: 'doc4' });

  test.equal(removedDoc.deleted, true);
  test.isTrue(removedDoc.updatedAt instanceof Date);
});

Tinytest.addAsync('recoverAsync with string selector', async function (test) {
  const doc = { _id: 'doc5', name: 'Test Doc' };

  await collection.insertAsync(doc);
  await collection.removeAsync('doc5');

  await collection.recoverAsync('doc5');

  const recoveredDoc = await collection.findOneAsync({ _id: 'doc5' });

  test.equal(recoveredDoc.deleted, false);
  test.isTrue(recoveredDoc.updatedAt instanceof Date);
  test.isUndefined(recoveredDoc.deletedAt);
});

Tinytest.addAsync('removeAsync with soft: false', async function (test) {
  const doc = { _id: 'doc3', name: 'Test Doc' };

  await collection.insertAsync(doc);
  await collection.removeAsync({ _id: 'doc3' }, { soft: false });

  const removedDoc = await collection.findOneAsync({ _id: 'doc3' });

  test.isUndefined(removedDoc);
});

Tinytest.add('configure', function (test) {
  const newConfig = {
    deleted: 'isDeleted',
    deletedAt: 'deletedAt',
    autoFilter: false,
    overrideRemove: false,
  };
  SoftDelete.configure(newConfig);
  const config = SoftDelete.config;
  test.equal(config.deleted, 'isDeleted');
  test.equal(config.deletedAt, 'deletedAt');
  test.equal(config.autoFilter, false);
  test.equal(config.overrideRemove, false);
});
