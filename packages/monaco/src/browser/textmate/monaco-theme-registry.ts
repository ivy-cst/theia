
/********************************************************************************
 * Copyright (C) 2018 TypeFox and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

/* eslint-disable @typescript-eslint/no-explicit-any */

import { IRawTheme, Registry } from 'vscode-textmate';

export interface ThemeMix extends IRawTheme, monaco.editor.IStandaloneThemeData { }

export class MonacoThemeRegistry {

    protected themes = new Map<string, ThemeMix>();

    public getTheme(name: string): IRawTheme | undefined {
        return this.themes.get(name);
    }

    setTheme(name: string, data: ThemeMix): void {
        // monaco auto refrehes a theme with new data
        monaco.editor.defineTheme(name, data);
        this.themes.set(name, data);
    }

    /**
     * Register VS Code compatible themes
     */
    public register(json: any, includes?: { [includePath: string]: any }, givenName?: string, monacoBase?: monaco.editor.BuiltinTheme): ThemeMix {
        const name = givenName || json.name!;
        const result: ThemeMix = {
            name,
            base: monacoBase || 'vs',
            inherit: true,
            colors: {},
            rules: [],
            settings: []
        };
        if (typeof json.include !== 'undefined') {
            if (!includes || !includes[json.include]) {
                console.error(`Couldn't resolve includes theme ${json.include}.`);
            } else {
                const parentTheme = this.register(includes[json.include], includes);
                Object.assign(result.colors, parentTheme.colors);
                result.rules.push(...parentTheme.rules);
                result.settings.push(...parentTheme.settings);
            }
        }
        if (json.tokenColors) {
            result.settings.push(...json.tokenColors);
        }
        if (json.colors) {
            Object.assign(result.colors, json.colors);
            result.encodedTokensColors = Object.keys(result.colors).map(key => result.colors[key]);
        }
        if (monacoBase && givenName) {
            for (const setting of result.settings) {
                this.transform(setting, rule => result.rules.push(rule));
            }
            const reg = new Registry();
            reg.setTheme(result);
            result.encodedTokensColors = reg.getColorMap();
            // index 0 has to be set to null as it is 'undefined' by default, but monaco code expects it to be null
            // eslint-disable-next-line no-null/no-null
            result.encodedTokensColors[0] = null!;
            // index 1 and 2 are the default colors
            if (result.colors && result.colors['editor.foreground']) {
                result.encodedTokensColors[1] = result.colors['editor.foreground'];
            }
            if (result.colors && result.colors['editor.background']) {
                result.encodedTokensColors[2] = result.colors['editor.background'];
            }
            this.setTheme(givenName, result);
        }
        return result;
    }

    protected transform(tokenColor: any, acceptor: (rule: monaco.editor.ITokenThemeRule) => void): void {
        if (typeof tokenColor.scope === 'undefined') {
            tokenColor.scope = [''];
        } else if (typeof tokenColor.scope === 'string') {
            tokenColor.scope = tokenColor.scope.split(',').map((scope: string) => scope.trim());
        }

        for (const scope of tokenColor.scope) {

            // Converting numbers into a format that monaco understands
            const settings = Object.keys(tokenColor.settings).reduce((previous: { [key: string]: string }, current) => {
                let value: string = tokenColor.settings[current];
                if (typeof value === typeof '') {
                    value = value.replace(/^\#/, '').slice(0, 6);
                }
                previous[current] = value;
                return previous;
            }, {});

            acceptor({
                ...settings, token: scope
            });
        }
    }
}

export namespace MonacoThemeRegistry {
    export const SINGLETON = new MonacoThemeRegistry();

    export const DARK_DEFAULT_THEME: string = SINGLETON.register(require('../../../data/monaco-themes/vscode/dark_theia.json'), {
        './dark_defaults.json': require('../../../data/monaco-themes/vscode/dark_defaults.json'),
        './dark_vs.json': require('../../../data/monaco-themes/vscode/dark_vs.json'),
        './dark_plus.json': require('../../../data/monaco-themes/vscode/dark_plus.json')
    }, 'dark-theia', 'vs-dark').name!;
    export const LIGHT_DEFAULT_THEME: string = SINGLETON.register(require('../../../data/monaco-themes/vscode/light_theia.json'), {
        './light_defaults.json': require('../../../data/monaco-themes/vscode/light_defaults.json'),
        './light_vs.json': require('../../../data/monaco-themes/vscode/light_vs.json'),
        './light_plus.json': require('../../../data/monaco-themes/vscode/light_plus.json'),
    }, 'light-theia', 'vs').name!;
    export const HC_DEFAULT_THEME: string = SINGLETON.register(require('../../../data/monaco-themes/vscode/hc_theia.json'), {
        './hc_black_defaults.json': require('../../../data/monaco-themes/vscode/hc_black_defaults.json'),
        './hc_black.json': require('../../../data/monaco-themes/vscode/hc_black.json')
    }, 'hc-theia', 'hc-black').name!;
}
