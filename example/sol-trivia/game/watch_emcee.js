const { clusterApiUrl, Connection, Keypair, PublicKey } = require('@solana/web3.js');
const { BehaviorSubject, Observable } = require('rxjs');
const { bus } = require('../bus');

let connection = new Connection(clusterApiUrl('devnet'));

// Connect to wallet - bytes from emcee_wallet.json
let emceePublicKey = '4PNBPR9NtGSsmscgZ616qbzuxioPSDsVAXAVmyEXzaXF';
let secretKey = Uint8Array.from([
	110, 30, 208, 112, 109, 184, 95, 210, 39, 151, 245, 187, 31, 128, 246, 235,
	252, 137, 195, 156, 187, 18, 122, 239, 202, 69, 25, 159, 3, 183, 173, 80, 50,
	77, 201, 44, 171, 42, 116, 130, 136, 161, 166, 24, 131, 88, 45, 65, 240, 89,
	111, 56, 200, 88, 7, 53, 70, 170, 106, 244, 35, 241, 30, 102,
]);
let emceeKeypair = Keypair.fromSecretKey(secretKey);

bus.listen(
	(e) => e.type === 'address/monitor',
	({ address }) =>
		new Observable((notify) => {
			connection.onAccountChange(address, async (change) => {
				const memo = JSON.parse((await connection.getConfirmedSignaturesForAddress2(address, { limit: 1 }))[0].memo.replace(/^.*{/, '{'))
				notify.next({ ...change, memo });
			}, 'processed');
			return () => {
				console.log('TODO unsubscribe connection from account change events');
			};
		}),
	{
		next(change) {
			const { data, owner } = change;
			console.log('Emcee event: ', change);
		},
	}
);

bus.trigger({ type: 'address/monitor', address: emceeKeypair.publicKey });
// XXX monitor memo for changes
// bus.trigger({ type: 'address/monitor', address: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr") });
