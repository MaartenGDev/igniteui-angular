﻿import { Component, ViewChild } from '@angular/core';
import { async, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Calendar } from '../../calendar/index';
import { SortingDirection } from '../../data-operations/sorting-expression.interface';
import { IgxGridComponent } from './grid.component';
import { IgxGridModule } from './index';
import { IgxGridRowComponent } from './grid-row.component';
import { IgxStringFilteringOperand } from '../../data-operations/filtering-condition';
import { configureTestSuite } from '../../test-utils/configure-suite';
import { IgxGridHeaderGroupComponent } from '../headers/grid-header-group.component';
import { IGridCellEventArgs } from '../common/events';
import { IgxColumnComponent } from '../columns/column.component';
import { ColumnPinningPosition } from '../common/enums';
import { IPinningConfig } from '../common/grid.interface';
import { wait, UIInteractions } from '../../test-utils/ui-interactions.spec';
import { GridSummaryFunctions } from '../../test-utils/grid-functions.spec';

describe('IgxGrid - Column Pinning #grid', () => {
    const COLUMN_HEADER_CLASS = '.igx-grid__th';
    const CELL_CSS_CLASS = '.igx-grid__td';
    const FIXED_HEADER_CSS = 'igx-grid__th--pinned';
    const FIXED_CELL_CSS = 'igx-grid__td--pinned';
    const FIRST_PINNED_CELL_CSS = 'igx-grid__td--pinned-first';
    const DEBOUNCETIME = 30;

    describe('To Start', () => {
        configureTestSuite();

        beforeAll(async(() => {
            TestBed.configureTestingModule({
                declarations: [
                    DefaultGridComponent,
                    GridPinningComponent,
                    GridFeaturesComponent,
                    OverPinnedGridComponent,
                    PinnedGroupsGridComponent,
                    InnerPinnedGroupsGridComponent,
                    GridInitialPinningComponent
                ],
                imports: [NoopAnimationsModule, IgxGridModule]
            }).compileComponents();
        }));

        it('should correctly initialize when there are initially pinned columns.', fakeAsync(() => {
            const fix = TestBed.createComponent(DefaultGridComponent);
            tick();
            fix.detectChanges();
            const grid = fix.componentInstance.instance;
            // verify pinned/unpinned collections
            expect(grid.pinnedColumns.length).toEqual(2);
            expect(grid.unpinnedColumns.length).toEqual(9);

            // verify DOM
            const firstIndexCell = grid.getCellByColumn(0, 'CompanyName');
            expect(firstIndexCell.visibleColumnIndex).toEqual(0);

            const lastIndexCell = grid.getCellByColumn(0, 'ContactName');
            expect(lastIndexCell.visibleColumnIndex).toEqual(1);
            expect(lastIndexCell.nativeElement.classList.contains(FIXED_CELL_CSS)).toBe(true);

            const headers = fix.debugElement.queryAll(By.css(COLUMN_HEADER_CLASS));

            expect(headers[0].context.column.field).toEqual('CompanyName');

            expect(headers[1].context.column.field).toEqual('ContactName');
            expect(headers[1].parent.nativeElement.classList.contains(FIXED_HEADER_CSS)).toBe(true);

            // verify container widths
            expect(grid.pinnedWidth).toEqual(400);
            expect(grid.unpinnedWidth + grid.scrollWidth).toEqual(400);
        }));

        it('should allow pinning/unpinning via the grid API', fakeAsync(() => {
            const fix = TestBed.createComponent(DefaultGridComponent);
            fix.detectChanges();
            const grid = fix.componentInstance.instance;

            // Unpin column
            grid.unpinColumn('CompanyName');
            tick();
            fix.detectChanges();

            // verify column is unpinned
            expect(grid.pinnedColumns.length).toEqual(1);
            expect(grid.unpinnedColumns.length).toEqual(10);

            const col = grid.getColumnByName('CompanyName');
            expect(col.pinned).toBe(false);
            expect(col.visibleIndex).toEqual(2);

            // verify DOM
            let cell = grid.getCellByColumn(0, 'CompanyName');
            expect(cell.visibleColumnIndex).toEqual(2);
            expect(cell.nativeElement.classList.contains(FIXED_CELL_CSS)).toBe(false);

            const headers = fix.debugElement.queryAll(By.css(COLUMN_HEADER_CLASS));

            expect(headers[2].context.column.field).toEqual('CompanyName');
            expect(headers[2].nativeElement.classList.contains(FIXED_CELL_CSS)).toBe(false);

            // verify container widths
            expect(grid.pinnedWidth).toEqual(200);
            expect(grid.unpinnedWidth + grid.scrollWidth).toEqual(600);

            // pin back the column.
            grid.pinColumn('CompanyName');
            tick();
            fix.detectChanges();

            // verify column is pinned
            expect(grid.pinnedColumns.length).toEqual(2);
            expect(grid.unpinnedColumns.length).toEqual(9);

            // verify container widths
            expect(grid.pinnedWidth).toEqual(400);
            expect(grid.unpinnedWidth + grid.scrollWidth).toEqual(400);

            expect(col.pinned).toBe(true);
            expect(col.visibleIndex).toEqual(1);

            cell = grid.getCellByColumn(0, 'CompanyName');
            expect(cell.visibleColumnIndex).toEqual(1);
            expect(cell.nativeElement.classList.contains(FIXED_CELL_CSS)).toBe(true);
        }));

        it('should allow pinning/unpinning via the column API', fakeAsync(() => {
            const fix = TestBed.createComponent(DefaultGridComponent);
            fix.detectChanges();
            const grid = fix.componentInstance.instance;

            const col = grid.getColumnByName('ID');

            col.pinned = true;
            tick();
            fix.detectChanges();

            // verify column is pinned
            expect(col.pinned).toBe(true);
            expect(col.visibleIndex).toEqual(2);

            expect(grid.pinnedColumns.length).toEqual(3);
            expect(grid.unpinnedColumns.length).toEqual(8);

            // verify container widths
            expect(grid.pinnedWidth).toEqual(600);
            expect(grid.unpinnedWidth + grid.scrollWidth).toEqual(200);

            col.pinned = false;

            // verify column is unpinned
            expect(col.pinned).toBe(false);
            expect(col.visibleIndex).toEqual(2);

            expect(grid.pinnedColumns.length).toEqual(2);
            expect(grid.unpinnedColumns.length).toEqual(9);

            // verify container widths
            expect(grid.pinnedWidth).toEqual(400);
            expect(grid.unpinnedWidth + grid.scrollWidth).toEqual(400);
        }));

        it('on unpinning should restore the original location(index) of the column', fakeAsync(() => {
            const fix = TestBed.createComponent(DefaultGridComponent);
            fix.detectChanges();
            const grid = fix.componentInstance.instance;
            const col = grid.getColumnByName('ContactName');
            expect(col.index).toEqual(2);

            // unpin
            col.pinned = false;
            tick();
            fix.detectChanges();

            // check props
            expect(col.index).toEqual(2);
            expect(col.visibleIndex).toEqual(2);

            // check DOM

            const headers = fix.debugElement.queryAll(By.css(COLUMN_HEADER_CLASS));

            expect(headers[2].context.column.field).toEqual('ContactName');
            expect(headers[2].nativeElement.classList.contains(FIXED_CELL_CSS)).toBe(false);

        }));

        it('should emit onColumnPinning event and allow changing the insertAtIndex param.', fakeAsync(() => {
            const fix = TestBed.createComponent(GridPinningComponent);
            fix.detectChanges();
            const grid = fix.componentInstance.instance;

            let col = grid.getColumnByName('ID');
            col.pinned = true;
            tick();
            fix.detectChanges();

            expect(col.visibleIndex).toEqual(0);

            col = grid.getColumnByName('City');
            col.pinned = true;
            tick();
            fix.detectChanges();
            expect(col.visibleIndex).toEqual(0);

            // check DOM
            const headers = fix.debugElement.queryAll(By.css(COLUMN_HEADER_CLASS));
            expect(headers[0].context.column.field).toEqual('City');
            expect(headers[1].context.column.field).toEqual('ID');
        }));

        it('should allow filter pinned columns', fakeAsync(() => {
            const fix = TestBed.createComponent(GridFeaturesComponent);
            fix.detectChanges();

            const grid = fix.componentInstance.grid;

            // Contains filter
            grid.filter('ProductName', 'Ignite', IgxStringFilteringOperand.instance().condition('contains'), true);
            fix.detectChanges();
            expect(grid.rowList.length).toEqual(2);
            expect(grid.getCellByColumn(0, 'ID').value).toEqual(1);
            expect(grid.getCellByColumn(1, 'ID').value).toEqual(3);

            // Unpin column
            grid.unpinColumn('ProductName');
            fix.detectChanges();
            expect(grid.rowList.length).toEqual(2);
            expect(grid.getCellByColumn(0, 'ID').value).toEqual(1);
            expect(grid.getCellByColumn(1, 'ID').value).toEqual(3);
        }));

        it('should allow sorting pinned columns', () => {
            const fix = TestBed.createComponent(GridFeaturesComponent);
            fix.detectChanges();

            const grid = fix.componentInstance.grid;
            const currentColumn = 'ProductName';
            const releasedColumn = 'Released';

            grid.sort({ fieldName: currentColumn, dir: SortingDirection.Asc, ignoreCase: true });

            fix.detectChanges();

            let expectedResult: any = null;
            expect(grid.getCellByColumn(0, currentColumn).value).toEqual(expectedResult);
            expectedResult = true;
            expect(grid.getCellByColumn(0, releasedColumn).value).toEqual(expectedResult);
            expectedResult = 'Some other item with Script';
            expect(grid.getCellByColumn(grid.data.length - 1, currentColumn).value).toEqual(expectedResult);
            expectedResult = null;
            expect(grid.getCellByColumn(grid.data.length - 1, releasedColumn).value).toEqual(expectedResult);

            // Unpin column
            grid.unpinColumn('ProductName');
            fix.detectChanges();

            expectedResult = null;
            expect(grid.getCellByColumn(0, currentColumn).value).toEqual(expectedResult);
            expectedResult = true;
            expect(grid.getCellByColumn(0, releasedColumn).value).toEqual(expectedResult);
            expectedResult = 'Some other item with Script';
            expect(grid.getCellByColumn(grid.data.length - 1, currentColumn).value).toEqual(expectedResult);
            expectedResult = null;
            expect(grid.getCellByColumn(grid.data.length - 1, releasedColumn).value).toEqual(expectedResult);
        });

        it('should allow hiding/showing pinned column.', fakeAsync(() => {
            const fix = TestBed.createComponent(GridPinningComponent);
            fix.detectChanges();
            const grid = fix.componentInstance.instance;
            const col = grid.getColumnByName('CompanyName');
            col.pinned = true;
            tick();
            fix.detectChanges();
            expect(grid.pinnedColumns.length).toEqual(1);
            expect(grid.unpinnedColumns.length).toEqual(9);

            col.hidden = true;
            tick();
            fix.detectChanges();

            expect(grid.pinnedColumns.length).toEqual(0);
            expect(grid.unpinnedColumns.length).toEqual(9);

            let headers = fix.debugElement.queryAll(By.css(COLUMN_HEADER_CLASS));

            expect(headers[0].context.column.field).toEqual('ID');
            expect(headers[0].nativeElement.classList.contains(FIXED_HEADER_CSS)).toBe(false);

            col.hidden = false;
            tick();
            fix.detectChanges();

            expect(grid.pinnedColumns.length).toEqual(1);
            expect(grid.unpinnedColumns.length).toEqual(9);

            headers = fix.debugElement.queryAll(By.css(COLUMN_HEADER_CLASS));

            expect(headers[0].context.column.field).toEqual('CompanyName');
            expect(headers[0].parent.nativeElement.classList.contains(FIXED_HEADER_CSS)).toBe(true);
        }));

        it('should allow pinning a hidden column.', fakeAsync(() => {
            const fix = TestBed.createComponent(GridPinningComponent);
            fix.detectChanges();
            const grid = fix.componentInstance.instance;
            const col = grid.getColumnByName('CompanyName');

            col.hidden = true;
            col.pinned = true;
            tick();
            fix.detectChanges();

            expect(grid.pinnedColumns.length).toEqual(0);
            expect(grid.unpinnedColumns.length).toEqual(9);

            col.hidden = false;
            tick();
            fix.detectChanges();

            expect(grid.pinnedColumns.length).toEqual(1);
            expect(grid.unpinnedColumns.length).toEqual(9);
        }));

        it('should allow hiding columns in the unpinned area.', fakeAsync(() => {

            const fix = TestBed.createComponent(GridPinningComponent);
            fix.detectChanges();
            const grid = fix.componentInstance.instance;
            const col1 = grid.getColumnByName('CompanyName');
            const col2 = grid.getColumnByName('ID');

            col1.pinned = true;
            tick();
            fix.detectChanges();
            col2.hidden = true;
            tick();
            fix.detectChanges();

            expect(grid.pinnedColumns.length).toEqual(1);
            expect(grid.unpinnedColumns.length).toEqual(8);

            const headers = fix.debugElement.queryAll(By.css(COLUMN_HEADER_CLASS));

            expect(headers[0].context.column.field).toEqual('CompanyName');
            expect(headers[1].context.column.field).toEqual('ContactName');
        }));

        it('should correctly initialize pinned columns z-index values.', fakeAsync(() => {
            const fix = TestBed.createComponent(DefaultGridComponent);
            fix.detectChanges();
            const grid = fix.componentInstance.instance;

            let headers = fix.debugElement.queryAll(By.directive(IgxGridHeaderGroupComponent));

            // First two headers are pinned
            expect(headers[0].componentInstance.zIndex).toEqual(9999);
            expect(headers[1].componentInstance.zIndex).toEqual(9998);

            grid.pinColumn('Region');
            tick();
            fix.detectChanges();

            // First three headers are pinned
            headers = fix.debugElement.queryAll(By.directive(IgxGridHeaderGroupComponent));
            expect(headers[2].componentInstance.zIndex).toEqual(9997);
        }));

        it('should not pin/unpin columns which are already pinned/unpinned', fakeAsync(() => {
            const fix = TestBed.createComponent(DefaultGridComponent);
            fix.detectChanges();

            const grid = fix.componentInstance.instance;
            const pinnedColumnsLength = grid.pinnedColumns.length;
            const unpinnedColumnsLength = grid.unpinnedColumns.length;

            let result = grid.pinColumn('CompanyName');
            tick();
            fix.detectChanges();

            expect(grid.pinnedColumns.length).toEqual(pinnedColumnsLength);
            expect(result).toBe(false);

            result = grid.unpinColumn('City');
            tick();
            fix.detectChanges();

            expect(grid.unpinnedColumns.length).toEqual(unpinnedColumnsLength);
            expect(result).toBe(false);
        }));

        it('should not reject pinning a column if unpinned area width is less than 20% of the grid width', fakeAsync(() => {
            const fix = TestBed.createComponent(GridPinningComponent);
            const grid = fix.componentInstance.instance;
            fix.detectChanges();
            grid.columns.forEach((column) => {
                if (column.index === 0 || column.index === 1 || column.index === 4 ||
                    column.index === 6) {
                    column.pinned = true;
                }
            });
            tick();
            fix.detectChanges();
            expect(grid.columns[0].pinned).toBe(true);
            expect(grid.columns[1].pinned).toBe(true);
            expect(grid.columns[4].pinned).toBe(true);
            expect(grid.columns[6].pinned).toBe(true);
        }));

        it('should fix column when grid width is 100% and column width is set', fakeAsync(() => {
            const fix = TestBed.createComponent(GridInitialPinningComponent);
            fix.detectChanges();
            const grid = fix.componentInstance.instance;


            expect(grid.pinnedColumns.length).toEqual(1);
            expect(grid.unpinnedColumns.length).toEqual(2);
        }));

        it('should allow navigating to/from pinned area', (async() => {
            pending('https://github.com/IgniteUI/igniteui-angular/pull/6910');
            const fix = TestBed.createComponent(DefaultGridComponent);
            fix.detectChanges();
            const grid = fix.componentInstance.instance;

            const cellContactName = grid.getCellByColumn(0, 'ContactName');
            const range = {
                rowStart: cellContactName.rowIndex,
                rowEnd: cellContactName.rowIndex,
                columnStart: cellContactName.visibleColumnIndex,
                columnEnd: cellContactName.visibleColumnIndex
            };
            grid.selectRange(range);
            grid.navigation.activeNode = {row: cellContactName.rowIndex, column: cellContactName.visibleColumnIndex};
            fix.detectChanges();

            grid.navigation.dispatchEvent(UIInteractions.getKeyboardEvent('keydown', 'ArrowRight'));
            await wait(DEBOUNCETIME);
            fix.detectChanges();

            const cellID = grid.getCellByColumn(0, 'ID');
            expect(cellID.active).toBe(true);
            expect(cellContactName.active).toBe(false);

            grid.navigation.dispatchEvent(UIInteractions.getKeyboardEvent('keydown', 'ArrowLeft'));
            await wait(DEBOUNCETIME);
            fix.detectChanges();

            expect(cellID.active).toBe(false);
            expect(cellContactName.active).toBe(true);
        }));
    });

    describe('To End', () => {
        configureTestSuite();
        beforeAll(async(() => {
            TestBed.configureTestingModule({
                declarations: [
                    GridRightPinningComponent,
                    PinnedGroupsGridComponent,
                    GridRightPinningMRLComponent
                ],
                imports: [NoopAnimationsModule, IgxGridModule]
            }).compileComponents();
        }));

        it('should correctly initialize when there are initially pinned columns.', fakeAsync(() => {
            const fix = TestBed.createComponent(GridRightPinningComponent);

            tick();
            fix.detectChanges();
            const grid = fix.componentInstance.instance;
            const firstPinnedIndex = grid.unpinnedColumns.length;
            const secondPinnedIndex = grid.unpinnedColumns.length + 1;
            // verify pinned/unpinned collections
            expect(grid.pinnedColumns.length).toEqual(2);
            expect(grid.unpinnedColumns.length).toEqual(9);

            // verify DOM
            const firstIndexCell = grid.getCellByColumn(0, 'CompanyName');
            expect(firstIndexCell.visibleColumnIndex).toEqual(firstPinnedIndex);
            expect(firstIndexCell.nativeElement.classList.contains(FIRST_PINNED_CELL_CSS)).toBe(true);

            const lastIndexCell = grid.getCellByColumn(0, 'ContactName');
            expect(lastIndexCell.visibleColumnIndex).toEqual(secondPinnedIndex);

            const headers = fix.debugElement.queryAll(By.css(COLUMN_HEADER_CLASS));

            expect(headers[headers.length - 2].context.column.field).toEqual('CompanyName');

            expect(headers[headers.length - 1].context.column.field).toEqual('ContactName');
            // expect(headers[secondPinnedIndex].parent.nativeElement.classList.contains(FIXED_HEADER_CSS)).toBe(true);

            // verify container widths
            expect(grid.pinnedWidth).toEqual(400);
            expect(grid.unpinnedWidth + grid.scrollWidth).toEqual(400);
        }));

        it('should allow pinning/unpinning via the grid API', fakeAsync(() => {
            const fix = TestBed.createComponent(GridRightPinningComponent);
            fix.detectChanges();
            const grid = fix.componentInstance.instance;

            // Unpin column
            grid.unpinColumn('CompanyName');
            tick();
            fix.detectChanges();

            // verify column is unpinned
            expect(grid.pinnedColumns.length).toEqual(1);
            expect(grid.unpinnedColumns.length).toEqual(10);

            const col = grid.getColumnByName('CompanyName');
            expect(col.pinned).toBe(false);
            expect(col.visibleIndex).toEqual(1);

            // verify DOM
            let cell = grid.getCellByColumn(0, 'CompanyName');
            expect(cell.visibleColumnIndex).toEqual(1);
            expect(cell.nativeElement.classList.contains(FIXED_CELL_CSS)).toBe(false);

            const headers = fix.debugElement.queryAll(By.css(COLUMN_HEADER_CLASS));

            expect(headers[1].context.column.field).toEqual('CompanyName');
            expect(headers[1].nativeElement.classList.contains(FIXED_CELL_CSS)).toBe(false);

            // verify container widths
            expect(grid.pinnedWidth).toEqual(200);
            expect(grid.unpinnedWidth + grid.scrollWidth).toEqual(600);

            // pin back the column.
            grid.pinColumn('CompanyName');
            tick();
            fix.detectChanges();

            // verify column is pinned
            expect(grid.pinnedColumns.length).toEqual(2);
            expect(grid.unpinnedColumns.length).toEqual(9);

            // verify container widths
            expect(grid.pinnedWidth).toEqual(400);
            expect(grid.unpinnedWidth + grid.scrollWidth).toEqual(400);

            expect(col.pinned).toBe(true);
            expect(col.visibleIndex).toEqual(grid.unpinnedColumns.length + 1);

            cell = grid.getCellByColumn(0, 'CompanyName');
            expect(cell.visibleColumnIndex).toEqual(grid.unpinnedColumns.length + 1);
            expect(cell.nativeElement.classList.contains(FIXED_CELL_CSS)).toBe(true);
        }));

        it('should correctly pin column to right when row selectors are enabled.', fakeAsync(() => {
            const fix = TestBed.createComponent(GridRightPinningComponent);

            tick();
            fix.detectChanges();
            const grid = fix.componentInstance.instance;
            grid.rowSelectable = true;
            tick();
            fix.detectChanges();

            // check row DOM
            const row = grid.getRowByIndex(0).nativeElement;
            expect(row.children[0].className).toBe('igx-grid__cbx-selection');
            expect(row.children[1].className).toBe('igx-display-container');
            expect(row.children[2].getAttribute('aria-describedby')).toBe(grid.id + '_CompanyName');
            expect(row.children[3].getAttribute('aria-describedby')).toBe(grid.id + '_ContactName');

            // check scrollbar DOM
            const scrBarStartSection = fix.debugElement.query(By.css('.igx-grid__scroll-start'));
            const scrBarMainSection = fix.debugElement.query(By.css('.igx-grid__scroll-main'));
            const scrBarEndSection = fix.debugElement.query(By.css('.igx-grid__scroll-end'));

            expect(scrBarStartSection.nativeElement.offsetWidth).toEqual(grid.featureColumnsWidth());
            const pinnedColSum = grid.pinnedColumns.map(x => parseInt(x.calcWidth, 10)).reduce((x, y) => x + y);
            expect(scrBarEndSection.nativeElement.offsetWidth).toEqual(pinnedColSum);
            const expectedUnpinAreWidth = parseInt(grid.width, 10) - grid.featureColumnsWidth() - pinnedColSum - grid.scrollWidth;
            expect(scrBarMainSection.nativeElement.offsetWidth).toEqual(expectedUnpinAreWidth);
        }));

        it('should correctly pin column groups to end.', async() => {
            const fix = TestBed.createComponent(PinnedGroupsGridComponent);
            fix.detectChanges();

            const grid = fix.componentInstance.instance;
            grid.pinning = { columns: ColumnPinningPosition.End };
            fix.detectChanges();
            await wait();
            fix.detectChanges();
            const pinnedCols = grid.pinnedColumns.filter(x => !x.columnGroup);
            expect(pinnedCols.length).toBe(3);

            expect(grid.getColumnByName('CompanyName').isFirstPinned).toBeTruthy();
            const row = grid.getRowByIndex(0).nativeElement;
            // check cells are rendered after main display container and have left offset
            for (let i = 0; i <= pinnedCols.length - 1; i++) {
                const elem = row.children[i + 1];
                expect(parseInt((elem as any).style.left, 10)).toBe(-450);
                expect(elem.getAttribute('aria-describedby')).toBe(grid.id + '_' + pinnedCols[i].field);
            }

            // check correct headers have left border
            const fistPinnedHeaders = fix.debugElement.query(By.css('.igx-grid__thead-wrapper'))
            .queryAll((By.css('.igx-grid__th--pinned-first')));
            expect(fistPinnedHeaders[0].nativeElement.getAttribute('aria-label')).toBe('General Information');
            expect(fistPinnedHeaders[1].context.column.field).toBe('CompanyName');
        });

        it('should pin an unpinned column when drag/drop it among pinned columns.', (async() => {

            const fix = TestBed.createComponent(GridRightPinningComponent);
            fix.detectChanges();

            const grid = fix.componentInstance.instance;
            grid.pinning = { columns: ColumnPinningPosition.End };
            fix.detectChanges();
            await wait();
            fix.detectChanges();

            // move 'ID' column to the pinned area
            grid.moveColumn(grid.getColumnByName('ID'), grid.getColumnByName('ContactName'));
            fix.detectChanges();

            // verify column is pinned at the correct place
            expect(grid.pinnedColumns[0].field).toEqual('CompanyName');
            expect(grid.pinnedColumns[1].field).toEqual('ID');
            expect(grid.pinnedColumns[2].field).toEqual('ContactName');
            expect(grid.getColumnByName('ID').pinned).toBeTruthy();
        }));

        it('should correctly pin columns with their summaries to end.', async() => {
            const fix = TestBed.createComponent(GridRightPinningComponent);
            fix.detectChanges();

            const grid = fix.componentInstance.instance;
            grid.pinning = { columns: ColumnPinningPosition.End };
            grid.columns.forEach(col => {
                if (col.field === 'CompanyName' || col.field === 'ContactName') {
                    col.hasSummary = true;
                }
            });
            fix.detectChanges();
            await wait();
            fix.detectChanges();
            const summaryRow = fix.debugElement.query(By.css('igx-grid-summary-row'));
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 9,
                ['Count'], ['27']);
            GridSummaryFunctions.verifyColumnSummaries(summaryRow, 10,
                ['Count'], ['27']);
            const pinnedSummaryCells = summaryRow.queryAll(By.css('igx-grid-summary-cell.igx-grid-summary--pinned'));
            expect(pinnedSummaryCells[0].nativeElement.className.indexOf('igx-grid-summary--pinned-first'))
                .not.toBe(-1);
            expect(pinnedSummaryCells[1].nativeElement.className.indexOf('igx-grid-summary--pinned-first'))
                .toBe(-1);
        });

        it('should correctly pin multi-row-layouts to end.', () => {
            const fix = TestBed.createComponent(GridRightPinningMRLComponent);
            fix.detectChanges();
            const grid = fix.componentInstance.instance;
            // check row DOM
            const row = grid.getRowByIndex(0).nativeElement;
            expect(row.children[0].classList.contains('igx-display-container')).toBeTruthy();
            expect(row.children[1].classList.contains('igx-grid__td--pinned-first')).toBeTruthy();
            expect(row.children[1].classList.contains('igx-grid__mrl-block')).toBeTruthy();
            expect(parseInt((row.children[1] as any).style.left, 10)).toEqual(-408);

            // check correct headers have left border
            const fistPinnedHeaders = fix.debugElement.query(By.css('.igx-grid__thead-wrapper'))
                .query((By.css('.igx-grid__th--pinned-first')));
            expect(fistPinnedHeaders.classes['igx-grid__mrl-block']).toBeTruthy();
            expect(fistPinnedHeaders.classes['igx-grid__th--pinned-first']).toBeTruthy();
        });

        it('should allow navigating to/from pinned area', (async() => {
            pending('https://github.com/IgniteUI/igniteui-angular/pull/6910');
            const fix = TestBed.createComponent(GridRightPinningComponent);
            fix.detectChanges();
            const grid = fix.componentInstance.instance as any;

            const cellCompanyName = grid.getCellByColumn(0, 'CompanyName');
            const range = { rowStart: 0, rowEnd: 0, columnStart: 9, columnEnd: 9 };
            grid.selectRange(range);
            grid.navigation.activeNode = {row: 0, column: 9};
            fix.detectChanges();
            expect(cellCompanyName.active).toBe(true);

            grid.navigation.dispatchEvent(UIInteractions.getKeyboardEvent('keydown', 'ArrowLeft'));
            await wait(DEBOUNCETIME);
            fix.detectChanges();
            const cellFax = grid.getCellByColumn(0, 'Fax');
            expect(cellFax.active).toBe(true);
            expect(cellCompanyName.active).toBe(false);

            grid.navigation.dispatchEvent(UIInteractions.getKeyboardEvent('keydown', 'ArrowRight'));
            await wait(DEBOUNCETIME);
            fix.detectChanges();
            expect(cellFax.active).toBe(false);
            expect(cellCompanyName.active).toBe(true);
        }));

        it('should allow navigating to/from pinned area using Ctrl+Left/Right', (async() => {
            pending('https://github.com/IgniteUI/igniteui-angular/pull/6910');
            const fix = TestBed.createComponent(GridRightPinningComponent);
            fix.detectChanges();
            const grid = fix.componentInstance.instance as any;

            const cellCompanyName = grid.getCellByColumn(0, 'CompanyName');
            const range = { rowStart: 0, rowEnd: 0, columnStart: 9, columnEnd: 9 };
            grid.selectRange(range);
            grid.navigation.activeNode = {row: 0, column: 9};
            fix.detectChanges();
            expect(cellCompanyName.active).toBe(true);

            grid.navigation.dispatchEvent(UIInteractions.getKeyboardEvent('keydown', 'ArrowLeft', false, false, true));
            await wait(DEBOUNCETIME);
            fix.detectChanges();
            const cellID = grid.getCellByColumn(0, 'ID');
            expect(cellID.active).toBe(true);
            expect(cellCompanyName.active).toBe(false);

            grid.navigation.dispatchEvent(UIInteractions.getKeyboardEvent('keydown', 'ArrowRight', false, false, true));
            await wait(DEBOUNCETIME);
            fix.detectChanges();
            const cellContactName = grid.getCellByColumn(0, 'ContactName');
            expect(cellID.active).toBe(false);
            expect(cellContactName.active).toBe(true);
        }));
    });
});

/* tslint:disable */
const companyData = [
    { "ID": "ALFKI", "CompanyName": "Alfreds Futterkiste", "ContactName": "Maria Anders", "ContactTitle": "Sales Representative", "Address": "Obere Str. 57", "City": "Berlin", "Region": null, "PostalCode": "12209", "Country": "Germany", "Phone": "030-0074321", "Fax": "030-0076545" },
    { "ID": "ANATR", "CompanyName": "Ana Trujillo Emparedados y helados", "ContactName": "Ana Trujillo", "ContactTitle": "Owner", "Address": "Avda. de la Constitución 2222", "City": "México D.F.", "Region": null, "PostalCode": "05021", "Country": "Mexico", "Phone": "(5) 555-4729", "Fax": "(5) 555-3745" },
    { "ID": "ANTON", "CompanyName": "Antonio Moreno Taquería", "ContactName": "Antonio Moreno", "ContactTitle": "Owner", "Address": "Mataderos 2312", "City": "México D.F.", "Region": null, "PostalCode": "05023", "Country": "Mexico", "Phone": "(5) 555-3932", "Fax": null },
    { "ID": "AROUT", "CompanyName": "Around the Horn", "ContactName": "Thomas Hardy", "ContactTitle": "Sales Representative", "Address": "120 Hanover Sq.", "City": "London", "Region": null, "PostalCode": "WA1 1DP", "Country": "UK", "Phone": "(171) 555-7788", "Fax": "(171) 555-6750" },
    { "ID": "BERGS", "CompanyName": "Berglunds snabbköp", "ContactName": "Christina Berglund", "ContactTitle": "Order Administrator", "Address": "Berguvsvägen 8", "City": "Luleå", "Region": null, "PostalCode": "S-958 22", "Country": "Sweden", "Phone": "0921-12 34 65", "Fax": "0921-12 34 67" },
    { "ID": "BLAUS", "CompanyName": "Blauer See Delikatessen", "ContactName": "Hanna Moos", "ContactTitle": "Sales Representative", "Address": "Forsterstr. 57", "City": "Mannheim", "Region": null, "PostalCode": "68306", "Country": "Germany", "Phone": "0621-08460", "Fax": "0621-08924" },
    { "ID": "BLONP", "CompanyName": "Blondesddsl père et fils", "ContactName": "Frédérique Citeaux", "ContactTitle": "Marketing Manager", "Address": "24, place Kléber", "City": "Strasbourg", "Region": null, "PostalCode": "67000", "Country": "France", "Phone": "88.60.15.31", "Fax": "88.60.15.32" },
    { "ID": "BOLID", "CompanyName": "Bólido Comidas preparadas", "ContactName": "Martín Sommer", "ContactTitle": "Owner", "Address": "C/ Araquil, 67", "City": "Madrid", "Region": null, "PostalCode": "28023", "Country": "Spain", "Phone": "(91) 555 22 82", "Fax": "(91) 555 91 99" },
    { "ID": "BONAP", "CompanyName": "Bon app'", "ContactName": "Laurence Lebihan", "ContactTitle": "Owner", "Address": "12, rue des Bouchers", "City": "Marseille", "Region": null, "PostalCode": "13008", "Country": "France", "Phone": "91.24.45.40", "Fax": "91.24.45.41" },
    { "ID": "BOTTM", "CompanyName": "Bottom-Dollar Markets", "ContactName": "Elizabeth Lincoln", "ContactTitle": "Accounting Manager", "Address": "23 Tsawassen Blvd.", "City": "Tsawassen", "Region": "BC", "PostalCode": "T2F 8M4", "Country": "Canada", "Phone": "(604) 555-4729", "Fax": "(604) 555-3745" },
    { "ID": "BSBEV", "CompanyName": "B's Beverages", "ContactName": "Victoria Ashworth", "ContactTitle": "Sales Representative", "Address": "Fauntleroy Circus", "City": "London", "Region": null, "PostalCode": "EC2 5NT", "Country": "UK", "Phone": "(171) 555-1212", "Fax": null },
    { "ID": "CACTU", "CompanyName": "Cactus Comidas para llevar", "ContactName": "Patricio Simpson", "ContactTitle": "Sales Agent", "Address": "Cerrito 333", "City": "Buenos Aires", "Region": null, "PostalCode": "1010", "Country": "Argentina", "Phone": "(1) 135-5555", "Fax": "(1) 135-4892" },
    { "ID": "CENTC", "CompanyName": "Centro comercial Moctezuma", "ContactName": "Francisco Chang", "ContactTitle": "Marketing Manager", "Address": "Sierras de Granada 9993", "City": "México D.F.", "Region": null, "PostalCode": "05022", "Country": "Mexico", "Phone": "(5) 555-3392", "Fax": "(5) 555-7293" },
    { "ID": "CHOPS", "CompanyName": "Chop-suey Chinese", "ContactName": "Yang Wang", "ContactTitle": "Owner", "Address": "Hauptstr. 29", "City": "Bern", "Region": null, "PostalCode": "3012", "Country": "Switzerland", "Phone": "0452-076545", "Fax": null },
    { "ID": "COMMI", "CompanyName": "Comércio Mineiro", "ContactName": "Pedro Afonso", "ContactTitle": "Sales Associate", "Address": "Av. dos Lusíadas, 23", "City": "Sao Paulo", "Region": "SP", "PostalCode": "05432-043", "Country": "Brazil", "Phone": "(11) 555-7647", "Fax": null },
    { "ID": "CONSH", "CompanyName": "Consolidated Holdings", "ContactName": "Elizabeth Brown", "ContactTitle": "Sales Representative", "Address": "Berkeley Gardens 12 Brewery", "City": "London", "Region": null, "PostalCode": "WX1 6LT", "Country": "UK", "Phone": "(171) 555-2282", "Fax": "(171) 555-9199" },
    { "ID": "DRACD", "CompanyName": "Drachenblut Delikatessen", "ContactName": "Sven Ottlieb", "ContactTitle": "Order Administrator", "Address": "Walserweg 21", "City": "Aachen", "Region": null, "PostalCode": "52066", "Country": "Germany", "Phone": "0241-039123", "Fax": "0241-059428" },
    { "ID": "DUMON", "CompanyName": "Du monde entier", "ContactName": "Janine Labrune", "ContactTitle": "Owner", "Address": "67, rue des Cinquante Otages", "City": "Nantes", "Region": null, "PostalCode": "44000", "Country": "France", "Phone": "40.67.88.88", "Fax": "40.67.89.89" },
    { "ID": "EASTC", "CompanyName": "Eastern Connection", "ContactName": "Ann Devon", "ContactTitle": "Sales Agent", "Address": "35 King George", "City": "London", "Region": null, "PostalCode": "WX3 6FW", "Country": "UK", "Phone": "(171) 555-0297", "Fax": "(171) 555-3373" },
    { "ID": "ERNSH", "CompanyName": "Ernst Handel", "ContactName": "Roland Mendel", "ContactTitle": "Sales Manager", "Address": "Kirchgasse 6", "City": "Graz", "Region": null, "PostalCode": "8010", "Country": "Austria", "Phone": "7675-3425", "Fax": "7675-3426" },
    { "ID": "FAMIA", "CompanyName": "Familia Arquibaldo", "ContactName": "Aria Cruz", "ContactTitle": "Marketing Assistant", "Address": "Rua Orós, 92", "City": "Sao Paulo", "Region": "SP", "PostalCode": "05442-030", "Country": "Brazil", "Phone": "(11) 555-9857", "Fax": null },
    { "ID": "FISSA", "CompanyName": "FISSA Fabrica Inter. Salchichas S.A.", "ContactName": "Diego Roel", "ContactTitle": "Accounting Manager", "Address": "C/ Moralzarzal, 86", "City": "Madrid", "Region": null, "PostalCode": "28034", "Country": "Spain", "Phone": "(91) 555 94 44", "Fax": "(91) 555 55 93" },
    { "ID": "FOLIG", "CompanyName": "Folies gourmandes", "ContactName": "Martine Rancé", "ContactTitle": "Assistant Sales Agent", "Address": "184, chaussée de Tournai", "City": "Lille", "Region": null, "PostalCode": "59000", "Country": "France", "Phone": "20.16.10.16", "Fax": "20.16.10.17" },
    { "ID": "FOLKO", "CompanyName": "Folk och fä HB", "ContactName": "Maria Larsson", "ContactTitle": "Owner", "Address": "Åkergatan 24", "City": "Bräcke", "Region": null, "PostalCode": "S-844 67", "Country": "Sweden", "Phone": "0695-34 67 21", "Fax": null },
    { "ID": "FRANK", "CompanyName": "Frankenversand", "ContactName": "Peter Franken", "ContactTitle": "Marketing Manager", "Address": "Berliner Platz 43", "City": "München", "Region": null, "PostalCode": "80805", "Country": "Germany", "Phone": "089-0877310", "Fax": "089-0877451" },
    { "ID": "FRANR", "CompanyName": "France restauration", "ContactName": "Carine Schmitt", "ContactTitle": "Marketing Manager", "Address": "54, rue Royale", "City": "Nantes", "Region": null, "PostalCode": "44000", "Country": "France", "Phone": "40.32.21.21", "Fax": "40.32.21.20" },
    { "ID": "FRANS", "CompanyName": "Franchi S.p.A.", "ContactName": "Paolo Accorti", "ContactTitle": "Sales Representative", "Address": "Via Monte Bianco 34", "City": "Torino", "Region": null, "PostalCode": "10100", "Country": "Italy", "Phone": "011-4988260", "Fax": "011-4988261" }
];
/* tslint:enable */

@Component({
    template: `
        <igx-grid
            [width]='"800px"'
            [height]='"300px"'
            [data]="data"
            (onColumnInit)="initColumns($event)"
            (onSelection)="cellSelected($event)"
            [autoGenerate]="true">
        </igx-grid>
    `
})
export class DefaultGridComponent {
    public selectedCell;

    public data = companyData;

    @ViewChild(IgxGridComponent, { read: IgxGridComponent, static: true })
    public instance: IgxGridComponent;

    public initColumns(column: IgxColumnComponent) {
        if (column.field === 'CompanyName' || column.field === 'ContactName') {
            column.pinned = true;
        }
        column.width = '200px';
    }

    public cellSelected(event: IGridCellEventArgs) {
        this.selectedCell = event.cell;
    }
}

@Component({
    template: `
        <igx-grid
            [width]='"800px"'
            [height]='"300px"'
            [data]="data"
            (onSelection)="cellSelected($event)"
            (onColumnPinning)="columnPinningHandler($event)"
          >
        <igx-column  *ngFor="let c of columns" [field]="c.field" [header]="c.field" [width]="c.width">
        </igx-column>
        </igx-grid>
    `
})
export class GridPinningComponent {
    public selectedCell;
    public data = [{
        ID: 'ALFKI',
        CompanyName: 'Alfreds Futterkiste',
        ContactName: 'Maria Anders',
        ContactTitle: 'Sales Representative',
        Address: 'Obere Str. 57',
        City: 'Berlin',
        Region: null,
        PostalCode: '12209',
        Country: 'Germany',
        Phone: '030-0074321',
        Fax: '030-0076545'
    }];
    public columns = [
        { field: 'ID', width: 100 },
        { field: 'CompanyName', width: 300 },
        { field: 'ContactName', width: 200 },
        { field: 'ContactTitle', width: 200 },
        { field: 'Address', width: 300 },
        { field: 'City', width: 100 },
        { field: 'Region', width: 100 },
        { field: 'PostalCode', width: 100 },
        { field: 'Phone', width: 150 },
        { field: 'Fax', width: 150 }
    ];

    @ViewChild(IgxGridComponent, { read: IgxGridComponent, static: true })
    public instance: IgxGridComponent;

    public columnPinningHandler($event) {
        $event.insertAtIndex = 0;
    }
    public cellSelected(event: IGridCellEventArgs) {
        this.selectedCell = event.cell;
    }
}

@Component({
    template: `<igx-grid [data]="data">
        <igx-column [field]="'ID'" [header]="'ID'"></igx-column>
        <igx-column [field]="'ProductName'" [filterable]="true" [sortable]="true" [pinned]="true" dataType="string"></igx-column>
        <igx-column [field]="'Downloads'" [filterable]="true" dataType="number"></igx-column>
        <igx-column [field]="'Released'" [filterable]="true" dataType="boolean"></igx-column>
        <igx-column [field]="'ReleaseDate'" [header]="'ReleaseDate'"
            [filterable]="true" dataType="date">
        </igx-column>
    </igx-grid>`
})
export class GridFeaturesComponent {

    public timeGenerator: Calendar = new Calendar();
    public today: Date = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate(), 0, 0, 0);

    public data = [
        {
            Downloads: 254,
            ID: 1,
            ProductName: 'Ignite UI for JavaScript',
            ReleaseDate: this.timeGenerator.timedelta(this.today, 'day', 15),
            Released: false
        },
        {
            Downloads: 127,
            ID: 2,
            ProductName: 'NetAdvantage',
            ReleaseDate: this.timeGenerator.timedelta(this.today, 'month', -1),
            Released: true
        },
        {
            Downloads: 20,
            ID: 3,
            ProductName: 'Ignite UI for Angular',
            ReleaseDate: null,
            Released: null
        },
        {
            Downloads: null,
            ID: 4,
            ProductName: null,
            ReleaseDate: this.timeGenerator.timedelta(this.today, 'day', -1),
            Released: true
        },
        {
            Downloads: 100,
            ID: 5,
            ProductName: '',
            ReleaseDate: undefined,
            Released: ''
        },
        {
            Downloads: 702,
            ID: 6,
            ProductName: 'Some other item with Script',
            ReleaseDate: this.timeGenerator.timedelta(this.today, 'day', 1),
            Released: null
        },
        {
            Downloads: 0,
            ID: 7,
            ProductName: null,
            ReleaseDate: this.timeGenerator.timedelta(this.today, 'month', 1),
            Released: true
        },
        {
            Downloads: 1000,
            ID: 8,
            ProductName: null,
            ReleaseDate: this.today,
            Released: false
        }
    ];

    @ViewChild(IgxGridComponent, { static: true }) public grid: IgxGridComponent;
}

@Component({
    template: `
        <igx-grid [width]='"800px"' [height]='"500px"' [data]="data">
            <igx-column *ngFor="let c of columns"
                [field]="c.field" [header]="c.field" [width]="c.width" [pinned]='c.pinned' [hidden]='c.hidden'>
            </igx-column>
        </igx-grid>
    `
})
export class OverPinnedGridComponent {
    @ViewChild(IgxGridComponent, { read: IgxGridComponent, static: true })
    public instance: IgxGridComponent;

    public selectedCell;
    public data = companyData;
    public columns = [
        { field: 'ID', width: '150px', hidden: true },
        { field: 'CompanyName', width: '150px', pinned: true },
        { field: 'ContactName', width: '150px', pinned: true },
        { field: 'ContactTitle', width: '150px', pinned: true },
        { field: 'Address', width: '150px', pinned: true },
        { field: 'Country', width: '150px' },
        { field: 'City', width: '150px', pinned: true },
        { field: 'Region', width: '150px' },
        { field: 'PostalCode', width: '150px' },
        { field: 'Phone', width: '150px', pinned: true },
        { field: 'Fax', width: '150px' },
    ];
}

@Component({
    template: `
        <igx-grid [width]='"800px"' [height]='"500px"' [data]="data">
            <igx-column field="ID" header="ID" width="150px" [hidden]='false'></igx-column>
            <igx-column-group header="General Information" [pinned]='true'>
                <igx-column field="CompanyName" header="CompanyName" width="150px" [pinned]='false' [hidden]='false'></igx-column>
                <igx-column-group header="Person Details">
                    <igx-column field="ContactName" header="ContactName" width="150px" [pinned]='false' [hidden]='false'></igx-column>
                    <igx-column field="ContactTitle" header="ContactTitle" width="150px" [pinned]='false' [hidden]='false'></igx-column>
                </igx-column-group>
            </igx-column-group>
            <igx-column-group header="Address Information">
                <igx-column-group header="Location" [pinned]="false">
                    <igx-column field="Country" header="Country" width="150px" [pinned]='false' [hidden]='false'></igx-column>
                    <igx-column field="Region" header="Region" width="150px" [pinned]='false' [hidden]='false'></igx-column>
                    <igx-column field="City" header="City" width="150px" [pinned]='false' [hidden]='false'></igx-column>
                    <igx-column field="Address" header="Address" width="150px" [pinned]='false' [hidden]='false'></igx-column>
                </igx-column-group>
                <igx-column-group header="Location" [pinned]="false">
                    <igx-column field="Phone" header="Phone" width="150px" [pinned]='false' [hidden]='false'></igx-column>
                    <igx-column field="Fax" header="Fax" width="150px" [pinned]='false' [hidden]='false'></igx-column>
                    <igx-column field="PostalCode" header="PostalCode" width="150px" [pinned]='false' [hidden]='false'></igx-column>
                </igx-column-group>
            </igx-column-group>
        </igx-grid>
    `
})
export class PinnedGroupsGridComponent {
    @ViewChild(IgxGridComponent, { read: IgxGridComponent, static: true })
    public instance: IgxGridComponent;

    public selectedCell;
    public data = companyData;
}

@Component({
    template: `
        <igx-grid [width]='"800px"' [height]='"500px"' [data]="data">
            <igx-column field="ID" header="ID" width="150px" [pinned]='true' [hidden]='false'></igx-column>
            <igx-column-group header="General Information" [pinned]='false'>
                <igx-column field="CompanyName" header="CompanyName" width="150px" [pinned]='true' [hidden]='false'></igx-column>
                <igx-column-group header="Person Details">
                    <igx-column field="ContactName" header="ContactName" width="150px" [pinned]='false' [hidden]='false'></igx-column>
                    <igx-column field="ContactTitle" header="ContactTitle" width="150px" [pinned]='false' [hidden]='false'></igx-column>
                </igx-column-group>
            </igx-column-group>
            <igx-column-group header="Address Information" [pinned]='false'>
                <igx-column-group header="Location" [pinned]="false">
                    <igx-column field="Country" header="Country" width="150px" [pinned]='false' [hidden]='false'></igx-column>
                    <igx-column field="Region" header="Region" width="150px" [pinned]='true' [hidden]='false'></igx-column>
                    <igx-column field="City" header="City" width="150px" [pinned]='false' [hidden]='false'></igx-column>
                    <igx-column field="Address" header="Address" width="150px" [pinned]='false' [hidden]='false'></igx-column>
                </igx-column-group>
                <igx-column-group header="Location" [pinned]="false">
                    <igx-column field="Phone" header="Phone" width="150px" [pinned]='false' [hidden]='false'></igx-column>
                    <igx-column field="Fax" header="Fax" width="150px" [pinned]='false' [hidden]='false'></igx-column>
                    <igx-column field="PostalCode" header="PostalCode" width="150px" [pinned]='false' [hidden]='false'></igx-column>
                </igx-column-group>
            </igx-column-group>
        </igx-grid>
    `
})
export class InnerPinnedGroupsGridComponent {
    @ViewChild(IgxGridComponent, { read: IgxGridComponent, static: true })
    public instance: IgxGridComponent;

    public selectedCell;
    public data = companyData;
}

@Component({
    template: `
        <igx-grid
            [width]='width'
            [height]='width'
            [data]="data"
          >
        <igx-column  *ngFor="let c of columns" [field]="c.field" [header]="c.field" [width]="c.width" [pinned]="c.pinned">
        </igx-column>
        </igx-grid>
    `
})
export class GridInitialPinningComponent {
    public selectedCell;
    public width = '100%';
    public height = '300px';
    public data = [{
        ID: 'ALFKI',
        CompanyName: 'Alfreds Futterkiste',
        ContactName: 'Maria Anders',
        ContactTitle: 'Sales Representative',
        Address: 'Obere Str. 57',
        City: 'Berlin',
        Region: null,
        PostalCode: '12209',
        Country: 'Germany',
        Phone: '030-0074321',
        Fax: '030-0076545'
    }];
    public columns = [
        { field: 'ID', width: 100, pinned: true },
        { field: 'CompanyName', width: 300 },
        { field: 'ContactName', width: 200 },
    ];

    @ViewChild(IgxGridComponent, { read: IgxGridComponent, static: true })
    public instance: IgxGridComponent;
}

@Component({
    template: `
        <igx-grid
            [pinning]='pinningConfig'
            [width]='"800px"'
            [height]='"300px"'
            [data]="data"
            (onColumnInit)="initColumns($event)"
            (onSelection)="cellSelected($event)"
            [autoGenerate]="true">
        </igx-grid>
    `
})
export class GridRightPinningComponent {
    public selectedCell;

    public data = companyData;
    public pinningConfig: IPinningConfig = { columns: ColumnPinningPosition.End };

    @ViewChild(IgxGridComponent, { read: IgxGridComponent, static: true })
    public instance: IgxGridComponent;

    public initColumns(column: IgxColumnComponent) {
        if (column.field === 'CompanyName' || column.field === 'ContactName') {
            column.pinned = true;
        }
        column.width = '200px';
    }

    public cellSelected(event: IGridCellEventArgs) {
        this.selectedCell = event.cell;
    }
}

@Component({
    template: `
        <igx-grid
            [pinning]='pinningConfig'
            [width]='"800px"'
            [height]='"500px"'
            [data]="data"
            [autoGenerate]="false">
            <igx-column-layout *ngFor='let group of colGroups' [pinned]='group.pinned'>
                <igx-column *ngFor='let col of group.columns'
                [rowStart]="col.rowStart" [colStart]="col.colStart" [width]='col.width'
                [colEnd]="col.colEnd" [rowEnd]="col.rowEnd" [field]='col.field'></igx-column>
            </igx-column-layout>
        </igx-grid>
    `
})
export class GridRightPinningMRLComponent extends GridRightPinningComponent {
    colGroups = [
        {
            group: 'group1',
            pinned: true,
            columns: [
                { field: 'ID', rowStart: 1, colStart: 1 },
                { field: 'CompanyName', rowStart: 1, colStart: 2 },
                { field: 'ContactName', rowStart: 1, colStart: 3 },
                { field: 'ContactTitle', rowStart: 2, colStart: 1, rowEnd: 4, colEnd: 4 },
            ]
        },
        {
            group: 'group2',
            columns: [
                { field: 'Country', rowStart: 1, colStart: 1, colEnd: 4, rowEnd: 3 },
                { field: 'Region', rowStart: 3, colStart: 1 },
                { field: 'PostalCode', rowStart: 3, colStart: 2 },
                { field: 'Fax', rowStart: 3, colStart: 3 }
            ]
        }
    ];
}
