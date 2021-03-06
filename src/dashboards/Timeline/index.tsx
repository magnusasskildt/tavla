import React, { Fragment, useMemo } from 'react'
import { Heading2 } from '@entur/typography'
import { LegBone } from '@entur/component-library'
import { LegMode } from '@entur/sdk'
import { colors } from '@entur/tokens'

import '@entur/component-library/lib/index.css'

import {
    getIcon, getIconColor, timeUntil, useCounter,
} from '../../utils'
import { LineData } from '../../types'

import { useStopPlacesWithDepartures } from '../../logic'
import DashboardWrapper from '../../containers/DashboardWrapper'

import './styles.scss'

const TICKS = [-1, 0, 1, 2, 3, 4, 5, 10, 15, 20, 30, 60]

// Use this to scale the race track.
const ZOOM = 1

function diffSincePreviousTick(minute: number): number {
    if (minute <= 0) return -1 * minute
    const index = TICKS.indexOf(minute)
    if (index < 0) return 0
    const prev = TICKS[index - 1] || 0
    return minute - prev
}

function competitorPosition(waitTime: number): number {
    const negativeTickOffset = Math.abs(TICKS.filter(tick => tick < 0).reduce((a, b) => a + b, 0))
    return ZOOM * (waitTime + negativeTickOffset * 60)
}

function groupDeparturesByMode(departures: Array<LineData>): { [mode in LegMode]?: Array<LineData> } {
    return departures.reduce((map, departure) => ({
        ...map,
        [departure.type]: [
            ...map[departure.type] || [],
            departure,
        ],
    }), {})
}

const MODE_ORDER = ['rail', 'metro', 'tram', 'bus', 'water', 'air']

function orderModes(modeA: string, modeB: string): number {
    return MODE_ORDER.indexOf(modeA) - MODE_ORDER.indexOf(modeB)
}

function getLegBonePattern(mode: LegMode): 'line' | 'dashed' | 'dotted' | 'wave' {
    switch (mode) {
        case 'bus':
            return 'dashed'
        case 'bicycle':
            return 'dotted'
        case 'water':
            return 'wave'
        case 'metro':
        case 'rail':
        case 'tram':
        case 'air':
        default:
            return 'line'
    }
}

function Tick({ minutes, mode, index }): JSX.Element {
    let label = `${minutes} min`
    let marginLeft = -30

    if (minutes === 0) {
        label = 'Nå'
        marginLeft = -20
    }

    if (minutes < 0) {
        label = ''
    }

    const width = diffSincePreviousTick(minutes) * (60 * ZOOM)
    const color = minutes < 0 ? colors.blues.blue30 : getIconColor(mode)

    return (
        <div style={{ minWidth: width }}>
            <LegBone
                className="timeline__leg-bone"
                pattern={getLegBonePattern(mode)}
                color={color}
                showStop={index <= TICKS.length}
                showStart={index === 0}
            />
            <div className="timeline__tick" style={{ marginLeft }}>
                { label }
            </div>
        </div>
    )
}

const TimelineDashboard = ({ history }: Props): JSX.Element => {
    useCounter()
    const stopPlacesWithDepartures = useStopPlacesWithDepartures()

    const data = useMemo(() => (stopPlacesWithDepartures || [])
        .filter(({ departures }) => departures.length > 0)
        .map(({ id, name, departures }) => ({
            stopId: id,
            name,
            groupedDepartures: Object.entries(groupDeparturesByMode(departures.reverse()))
                .sort(([ modeA ], [ modeB ]) => orderModes(modeA, modeB)),
        })), [stopPlacesWithDepartures])

    return (
        <DashboardWrapper
            className="timeline"
            history={history}
            stopPlacesWithDepartures={stopPlacesWithDepartures}
        >
            <div className="timeline__body">
                {
                    data.map(({ stopId, name, groupedDepartures }) => (
                        <div key={stopId} className="timeline__stop">
                            <Heading2 margin="none" style={{ margin: 0 }}>{name}</Heading2>
                            {
                                groupedDepartures.map(([mode, departures]) => (
                                    <Fragment key={mode}>
                                        <div className="timeline__track">
                                            { departures.map(({
                                                id, type, expectedDepartureTime, route,
                                            }) => {
                                                const waitTime = timeUntil(expectedDepartureTime)
                                                const Icon = getIcon(type)
                                                const color = getIconColor(type)
                                                return (
                                                    <div
                                                        key={id}
                                                        className="timeline__competitor"
                                                        style={{ right: competitorPosition(waitTime) }}
                                                    >
                                                        <div className="timeline__label">
                                                            {route}
                                                        </div>
                                                        <Icon
                                                            color={color}
                                                            size="large"
                                                        />
                                                    </div>
                                                )
                                            })}
                                        </div>
                                        <div className="timeline__line">
                                            { [...TICKS].reverse().map((minutes, index) => {
                                                return (
                                                    <Tick
                                                        key={minutes}
                                                        mode={mode}
                                                        minutes={minutes}
                                                        index={index}
                                                    />
                                                ) }) }
                                        </div>
                                    </Fragment>
                                ))
                            }
                        </div>
                    ))
                }
            </div>
        </DashboardWrapper>
    )
}

interface Props {
    history: any,
}

export default TimelineDashboard
