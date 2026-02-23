import { Injectable } from '@angular/core';
import { Sort } from '@angular/material/sort';

@Injectable({
  providedIn: 'root'
})

export class SortingService {

  constructor() { }

  sortFunction(sort: Sort, labels: string[], dataSource: any, defaultLabel?: string) {
    const data = dataSource.slice();
    if (!sort.active || sort.direction === '') {
      dataSource = data;
      return dataSource;
    }
    labels.map((x) => {
      //  if (x !='Language' && x !='version') {
      if (x === sort.active) {
        dataSource = data.sort((a, b) => {
          const isAsc = sort.direction === 'asc';
          switch (sort.active) {
            case x:
              return compare(a[x], b[x], isAsc);
            default:
              if (defaultLabel) {
                return compare(a[defaultLabel], b[defaultLabel], isAsc);
              } else {
                return 0;
              }
          }
        });
      }
      return dataSource;
      //  }
      // else if (x =='Language') {
      //   //  console.log("sssssdddddd")
      //     dataSource = data.sort((a, b) => {
      //         if (sort.direction == "asc") {
      //             return (a.version.split('-')[0].localeCompare(b.version.split('-')[0]))
      //         }
      //         else {
      //             return (b.version.split('-')[0].localeCompare(a.version.split('-')[0]))
      //         }

      //     })
      // }
      // else {

      //     dataSource = data.sort((a, b) => {

      //         if (sort.direction == "asc") {
      //             return (parseInt(a.version.split('V')[1].replace(/\D/g, ''),10)>parseInt(b.version.split('V')[1].replace(/\D/g, ''),10))
      //         }
      //         else {
      //             return (parseInt(b.version.split('V')[1].replace(/\D/g, ''),10)>parseInt(a.version.split('V')[1].replace(/\D/g, ''),10))
      //         }

      //     })
      // }
    });
    return dataSource;


    function compare(a: number | string, b: number | string, isAsc: boolean) {
      let x;
      let y;

      if (a === undefined || a === null) {
        x = '';
      } else {
        x = a.toString().toLowerCase();
      }

      if (b === undefined || b === null) {
        y = '';
      } else {
        y = b.toString().toLowerCase();
      }

      return (x < y ? -1 : 1) * (isAsc ? 1 : -1);
    }
  }

  checkType(event: Event | string) {
    let val;
    if (typeof event == 'object') {
      if (event.hasOwnProperty('iChange')) {
        val = event?.['iChange']?.currentValue;
        return val;
      }
      else if (event.target) {
        val = (event.target as HTMLInputElement).value;
        return val;
      }
      return val;
    } else if (typeof event == 'string') {
      val = event;
      return val;
    };
    return val;
  }

  defaultOrSavedSort(savedSortEvent: boolean, active: string, direction: 'asc' | 'desc') {
    if (!savedSortEvent) {
      const defaultSort = {
        active,
        direction
      };
      return defaultSort as Sort;
    } else {
      return savedSortEvent;
    };
  };



  /*
  searchFunction(event: string, datasetFiltered: any, datasetOriginal: any, infinityScrollLocked: boolean, isFirstTime: boolean) {
    let searchTerm = this.searchTerm = this.checkType(event);
    const isPincode = searchTerm.trim();
    if (/^[0-9]+$/.test(isPincode)) {
      datasetFiltered = datasetOriginal.filter((item) => {
        return ((item.pincode.toString().includes(isPincode)
        ))
      })
    }
    else if (searchTerm && searchTerm.trim() != '') {
      infinityScrollLocked = true
      datasetFiltered = datasetOriginal.filter((item) => {
        return ((item.institutionName.toLowerCase().includes(searchTerm.toLowerCase())
          || (item.registrationNumber.toString().toLowerCase().includes(searchTerm.toLowerCase()))
          || (item.representativeFirstName.toLowerCase().includes(searchTerm.toLowerCase()))
          || (item.representativeLastName.toLowerCase().includes(searchTerm.toLowerCase()))
          || (item.representativePhone.toLowerCase().includes(searchTerm.toLowerCase()))
        ))
      })
    }
    else {
      if(isFirstTime) {
        infinityScrollLocked = false
        datasetFiltered = datasetOriginal.slice(0, 10)
      }
    }
  }
  */

  /*
  deleteFunction(dataset, docId, subset, service, updateByIdMethod, uiService, isFirstTime: boolean, updateMasterDoc, masterData) {
    let name = subset.slice(0, 10)
    let config = {
      title: 'Delete Institute',
      message: `Are you sure you want to delete "${name}..." ?`,
      icon: {
        name: 'mat_outline:delete'
      }
    }
    const dialogRef = this.fuseConfirmationService.open(config)
    const instituteDetails = await service.getClassroomDataById(docId)

    dataset = Object.assign(instituteDetails, dataset)

    const masterInstituteDoc = masterData.filter(sch => sch.docId != docId)
    dialogRef.afterClosed().subscribe(async (result) => {
      if (result == 'confirmed') {
        updateByIdMethod(docId)
        await service.toTrash(docId, dataset)
        await updateMasterDoc(dataset, masterInstituteDoc);
        service.delete(docId).then(() => {
          isFirstTime = false;
          uiService.alertMessage('Deleted', `Institute "${name}..." deleted successfully`, 'error')
        })
      }
    });
  }
  */

}
