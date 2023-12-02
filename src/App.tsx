import React, { useEffect, useRef } from 'react';
import Drawflow from 'drawflow';
import { SkyWayAuthToken, nowInSec, uuidV4 } from '@skyway-sdk/token';
import { SkyWayChannel, SkyWayContext } from '@skyway-sdk/core';
import 'drawflow/dist/drawflow.min.css';
import './App.css';

export function App() {
    const drawflowElement = useRef<HTMLDivElement>(null);
    const appIdInputElement = useRef<HTMLInputElement>(null);
    const secretKeyInputElement = useRef<HTMLInputElement>(null);
    const skywayAuthTokenElement = useRef<HTMLTextAreaElement>(null);
    const channelIdInputElement = useRef<HTMLInputElement>(null);
    const channelNameInputElement = useRef<HTMLInputElement>(null);

    const [editor, setEditor] = React.useState<Drawflow>(null);

    useEffect(() => {
        const editor = new Drawflow(drawflowElement.current);
        editor.editor_mode = 'fixed';
        editor.start();
        setEditor(editor);
    }, []);

    const visualize = async () => {
        const appId = appIdInputElement.current?.value;
        const secretKey = secretKeyInputElement.current?.value;
        const skywayAuthToken = skywayAuthTokenElement.current?.value;
        const channelId = channelIdInputElement.current?.value;
        const channelName = channelNameInputElement.current?.value;

        if (!appId || appId === '') {
            throw new Error('App ID is required.');
        }

        if (!secretKey && !skywayAuthToken) {
            throw new Error('Either Secret Key or SkyWay Auth Token is required.');
        }

        if (!channelId && !channelName) {
            throw new Error('Either Channel ID or Channel Name is required.');
        }

        const token =
            skywayAuthToken !== ''
                ? skywayAuthToken
                : new SkyWayAuthToken({
                      jti: uuidV4(),
                      iat: nowInSec(),
                      exp: nowInSec() + 60 * 60 * 24,
                      scope: {
                          app: {
                              id: appId,
                              turn: true,
                              actions: ['read'],
                              channels: [
                                  {
                                      id: '*',
                                      name: '*',
                                      actions: ['write'],
                                      members: [
                                          {
                                              id: '*',
                                              name: '*',
                                              actions: ['write'],
                                              publication: {
                                                  actions: ['write'],
                                              },
                                              subscription: {
                                                  actions: ['write'],
                                              },
                                          },
                                      ],
                                      sfuBots: [
                                          {
                                              actions: ['write'],
                                              forwardings: [
                                                  {
                                                      actions: ['write'],
                                                  },
                                              ],
                                          },
                                      ],
                                  },
                              ],
                          },
                      },
                  }).encode(secretKey);

        skywayAuthTokenElement.current.value = token;

        const context = await SkyWayContext.Create(token);
        const channel = await SkyWayChannel.Find(context, {
            id: channelId,
            name: channelName,
        });

        const subscribers = new Map<string, (number | string)[]>();
        const memberNodeIds = new Map<string, number | string>();
        let headX = 0;
        let headY = 0;
        channel.members
            .filter((m) => m.type === 'person')
            .forEach((member) => {
                const memberNodeId = editor.addNode(
                    `${member.id}`,
                    1,
                    1,
                    headX,
                    headY,
                    'member',
                    '',
                    `${member.name ?? member.id} (${member.type})`,
                    false
                );
                memberNodeIds.set(member.id, memberNodeId);
                headX += 400;
                channel.publications
                    .filter((p) => p.publisher.id === member.id)
                    .forEach((publication) => {
                        const publicationNodeId = editor.addNode(
                            `${publication.id}`,
                            1,
                            1,
                            headX,
                            headY,
                            'publication',
                            '',
                            `${publication.id} (${publication.contentType})`,
                            false
                        );
                        editor.addConnection(memberNodeId, publicationNodeId, 'output_1', 'input_1');

                        headX += 400;
                        channel.subscriptions
                            .filter((s) => s.publication.id === publication.id)
                            .forEach((subscription) => {
                                const subscriptionNodeId = editor.addNode(
                                    `${subscription.id}`,
                                    1,
                                    1,
                                    headX,
                                    headY,
                                    'subscription',
                                    '',
                                    `${subscription.id}`,
                                    false
                                );
                                editor.addConnection(publicationNodeId, subscriptionNodeId, 'output_1', 'input_1');
                                if (subscribers.has(subscription.subscriber.id)) {
                                    subscribers.get(subscription.subscriber.id).push(subscriptionNodeId);
                                } else {
                                    subscribers.set(subscription.subscriber.id, [subscriptionNodeId]);
                                }
                                headY += 200;
                            });
                        headX -= 400;
                        headY += 200;
                    });

                headX = 0;
            });

        headX += 1500;
        headY = 0;
        channel.members
            .filter((m) => m.type === 'bot')
            .forEach((member) => {
                const memberNodeId = editor.addNode(
                    `${member.id}`,
                    1,
                    1,
                    headX,
                    headY,
                    'member',
                    '',
                    `${member.name ?? member.id} (${member.type})`,
                    false
                );
                memberNodeIds.set(member.id, memberNodeId);
                headX += 400;
                channel.publications
                    .filter((p) => p.publisher.id === member.id)
                    .forEach((publication) => {
                        const publicationNodeId = editor.addNode(
                            `${publication.id}`,
                            1,
                            1,
                            headX,
                            headY,
                            'publication',
                            '',
                            `${publication.id} (${publication.contentType})`,
                            false
                        );
                        editor.addConnection(memberNodeId, publicationNodeId, 'output_1', 'input_1');

                        headX += 400;
                        channel.subscriptions
                            .filter((s) => s.publication.id === publication.id)
                            .forEach((subscription, subscriptionIndex) => {
                                const subscriptionNodeId = editor.addNode(
                                    `${subscription.id}`,
                                    1,
                                    1,
                                    headX,
                                    headY,
                                    'subscription',
                                    '',
                                    `${subscription.id}`,
                                    false
                                );
                                editor.addConnection(publicationNodeId, subscriptionNodeId, 'output_1', 'input_1');
                                if (subscribers.has(subscription.subscriber.id)) {
                                    subscribers.get(subscription.subscriber.id).push(subscriptionNodeId);
                                } else {
                                    subscribers.set(subscription.subscriber.id, [subscriptionNodeId]);
                                }
                                headY += 200;
                            });
                        headX -= 400;
                        headY += 200;
                    });

                headX = 0;
            });

        for (const [subscriberId, subscriptionNodeIds] of subscribers.entries()) {
            subscriptionNodeIds.forEach((subscriptionNodeId) => {
                editor.addConnection(subscriptionNodeId, memberNodeIds.get(subscriberId), 'output_1', 'input_1');
            });
        }
    };

    return (
        <div>
            <div className="input-area">
                <div>
                    <label htmlFor="app-id">App ID: </label>
                    <input
                        ref={appIdInputElement}
                        id="app-id"
                        className="id-input"
                        type="text"
                        required
                        defaultValue={process.env.APP_ID ?? ''}
                    />
                </div>
                <div>
                    <label htmlFor="secret-key">Secret Key: </label>
                    <input
                        ref={secretKeyInputElement}
                        id="secret-key"
                        className="id-input"
                        type="text"
                        defaultValue={process.env.SECRET_KEY ?? ''}
                    />
                </div>
                <div>
                    <label htmlFor="skyway-auth-token">SkyWay Auth Token: </label>
                    <textarea ref={skywayAuthTokenElement} id="skyway-auth-token" cols={120} rows={8} />
                </div>
                <div>
                    <label htmlFor="chanel-id">Channel ID: </label>
                    <input ref={channelIdInputElement} id="chanel-id" className="id-input" type="text" />
                </div>
                <div>
                    <label htmlFor="chanel-name">Channel Name: </label>
                    <input ref={channelNameInputElement} id="chanel-name" className="id-input" type="text" />
                </div>
                <div>
                    <button id="visualize" onClick={visualize}>
                        Visualize
                    </button>
                </div>
            </div>
            <div className="output-area">
                <div id="drawflow" ref={drawflowElement}></div>
            </div>
        </div>
    );
}
